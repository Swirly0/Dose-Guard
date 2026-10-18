"""Talks to the pillbox Arduino over USB serial: compartment weights and indicator LEDs.

The weighing sketch prints one CSV line per day, then a blank line:
    Saturday,0.33,0.50,ON
The older W-line protocol is still accepted if present.
"""

import math
import threading
import time
from collections import deque

import serial
from serial.tools import list_ports

NUM_COMPARTMENTS = 7
LED_MODES = {"ON", "OFF", "BLINK", "FAST"}
DAY_INDEX = {
    "Sunday": 0,
    "Monday": 1,
    "Tuesday": 2,
    "Wednesday": 3,
    "Thursday": 4,
    "Friday": 5,
    "Saturday": 6,
}
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
        self._cycle: list[float | None] = [None] * NUM_COMPARTMENTS
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
        self, day: int, samples: int = 2, max_spread: float = 0.05, timeout: float = 8.0
    ) -> tuple[float | None, str | None]:
        """Uses recent grams for one compartment (the same values Settings shows).
        The Mega only finishes a full sweep every several seconds, so readings from just
        before the check started are included. Returns (grams, None) or (None, reason)."""
        start = time.monotonic()
        reason = "No readings from the scale."
        while time.monotonic() - start < timeout:
            if not self.connected:
                return None, self.error or "Scale is not connected."
            cutoff = start - 20
            with self._lock:
                recent = [
                    values[day - 1]
                    for t, values in self._readings
                    if t >= cutoff and values[day - 1] is not None
                ][-samples:]
            if recent:
                spread = max(recent) - min(recent)
                if spread <= max_spread:
                    return round(sum(recent) / len(recent), 3), None
                reason = f"Weight did not settle (readings varied by {spread:.2f} g)."
            time.sleep(0.1)
        latest = self.latest()
        if latest and latest[day - 1] is not None:
            return round(latest[day - 1], 3), None
        return None, reason

    def _send(self, command: str) -> None:
        if self._ser is None:
            raise RuntimeError(self.error or "Scale is not connected.")
        self._ser.write((command + "\n").encode())

    def _connect(self) -> None:
        port = self.requested_port or find_arduino_port()
        if not port:
            raise serial.SerialException("No Arduino found. Plug it in or set SCALE_PORT in backend/.env.")
        # Avoid toggling DTR/RTS: that resets the Mega and re-tares with pills already on the box.
        ser = serial.Serial(timeout=1)
        ser.port = port
        ser.baudrate = self.baud
        ser.dtr = False
        ser.rts = False
        ser.open()
        time.sleep(0.3)
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
            self._store(values)
        elif line == "OK TARE":
            self._tare_done.set()
        elif "," in line:
            name, weight, *_rest = line.split(",")
            day = DAY_INDEX.get(name)
            if day is None:
                return
            try:
                grams = float(weight)
            except ValueError:
                return
            self._cycle[day] = None if math.isnan(grams) else grams
            self._store(list(self._cycle))
        elif line == "" and any(v is not None for v in self._cycle):
            self._store(list(self._cycle))

    def _store(self, values: list[float | None]) -> None:
        with self._lock:
            self._readings.append((time.monotonic(), values))
