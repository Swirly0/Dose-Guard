"""Talks to the pillbox Arduino over USB serial: compartment weights and indicator LEDs.

Protocol (see firmware/doseguard_scale/doseguard_scale.ino):
    Arduino -> laptop:  "W g1 g2 g3 g4 g5 g6 g7"  grams, Sunday = 1 ... Saturday = 7, "nan" = no reading
                        "OK TARE", "OK LED", "PONG", "READY", "ERR ..."
    Laptop -> Arduino:  "TARE", "TARE <1-7>", "PING", "LED <1-7|ALL> <ON|OFF|BLINK|FAST> [ms]"
"""

import math
import threading
import time
from collections import deque

import serial
from serial.tools import list_ports

NUM_COMPARTMENTS = 7
LED_MODES = {"ON", "OFF", "BLINK", "FAST"}
# USB vendor IDs: Arduino LLC, Arduino SRL, and the CH340 chip used by many Mega clones.
ARDUINO_VIDS = {0x2341, 0x2A03, 0x1A86}


def find_arduino_port() -> str | None:
    for p in list_ports.comports():
        if p.vid in ARDUINO_VIDS or "arduino" in (p.description or "").lower():
            return p.device
    return None


class ScaleReader:
    """Keeps a background connection to the Arduino and the recent weight readings."""

    def __init__(self, port: str | None = None, baud: int = 115200):
        self.requested_port = port
        self.baud = baud
        self.port: str | None = None
        self.error: str | None = None
        self._ser: serial.Serial | None = None
        self._lock = threading.Lock()
        self._readings: deque[tuple[float, list[float | None]]] = deque(maxlen=100)
        self._tare_done = threading.Event()
        threading.Thread(target=self._run, daemon=True).start()

    @property
    def connected(self) -> bool:
        return self._ser is not None

    def latest(self) -> list[float | None] | None:
        with self._lock:
            return self._readings[-1][1] if self._readings else None

    def tare(self, day: int | None = None, timeout: float = 6.0) -> bool:
        """Zeroes all compartments (or one). Returns False if the Arduino didn't confirm."""
        self._tare_done.clear()
        self._send("TARE" if day is None else f"TARE {day}")
        return self._tare_done.wait(timeout)

    def set_led(self, day: int | None, mode: str, duration_ms: int = 0) -> None:
        """Sets one compartment's LED (or all when `day` is None). A non-zero `duration_ms`
        turns it off again after that long."""
        if mode not in LED_MODES:
            raise ValueError(f"LED mode must be one of {sorted(LED_MODES)}")
        target = "ALL" if day is None else str(day)
        self._send(f"LED {target} {mode}" + (f" {duration_ms}" if duration_ms else ""))

    def stable_weight(
        self, day: int, samples: int = 5, max_spread: float = 0.05, timeout: float = 8.0
    ) -> tuple[float | None, str | None]:
        """Waits for `samples` fresh readings of one compartment that agree within `max_spread`
        grams. Returns (grams, None), or (None, reason) if the reading is missing or unsettled."""
        start = time.monotonic()
        reason = "No readings from the scale."
        while time.monotonic() - start < timeout:
            if not self.connected:
                return None, self.error or "Scale is not connected."
            with self._lock:
                recent = [values[day - 1] for t, values in self._readings if t >= start][-samples:]
            if any(v is None for v in recent):
                reason = f"Load cell for compartment {day} is not responding."
            elif len(recent) == samples:
                spread = max(recent) - min(recent)
                if spread <= max_spread:
                    return round(sum(recent) / samples, 3), None
                reason = f"Weight did not settle (readings varied by {spread:.2f} g)."
            time.sleep(0.1)
        return None, reason

    def _send(self, command: str) -> None:
        if self._ser is None:
            raise RuntimeError(self.error or "Scale is not connected.")
        self._ser.write((command + "\n").encode())

    def _connect(self) -> None:
        port = self.requested_port or find_arduino_port()
        if not port:
            raise serial.SerialException("No Arduino found. Plug it in or set SCALE_PORT in backend/.env.")
        ser = serial.Serial(port, self.baud, timeout=1)
        time.sleep(2)  # opening the port resets the Mega; give it time to boot and tare
        ser.reset_input_buffer()
        self._ser, self.port, self.error = ser, port, None

    def _close(self) -> None:
        try:
            if self._ser:
                self._ser.close()
        except (serial.SerialException, OSError):
            pass
        self._ser = None

    def _run(self) -> None:
        while True:
            if self._ser is None:
                try:
                    self._connect()
                except (serial.SerialException, OSError) as e:
                    self.error = str(e)
                    time.sleep(3)
                    continue
            try:
                line = self._ser.readline().decode(errors="ignore").strip()
            except (serial.SerialException, OSError) as e:
                self.error = f"Lost connection to the Arduino: {e}"
                self._close()
                continue
            self._handle_line(line)

    def _handle_line(self, line: str) -> None:
        if line.startswith("W "):
            parts = line.split()[1:]
            if len(parts) != NUM_COMPARTMENTS:
                return
            values: list[float | None] = []
            for part in parts:
                try:
                    value = float(part)
                except ValueError:
                    value = math.nan
                values.append(None if math.isnan(value) else value)
            with self._lock:
                self._readings.append((time.monotonic(), values))
        elif line == "OK TARE":
            self._tare_done.set()
