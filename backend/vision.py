"""Counts pills per class in one compartment using the webcam and the Roboflow model."""

import threading
from collections import Counter
from pathlib import Path

import cv2
import requests

from live_preview import MAX_SEND_WIDTH, open_camera, stable_counts
from regions import assign_to_regions, draw_regions, load_regions
from test_inference import draw_predictions, infer_bytes

LAST_FRAME_PATH = Path(__file__).with_name("last_verify.jpg")


class Camera:
    """Keeps the webcam open between requests; opening it on Windows takes a few seconds."""

    def __init__(self, index: int, width: int, height: int):
        self.index, self.width, self.height = index, width, height
        self.error: str | None = None
        self._cap: cv2.VideoCapture | None = None
        self._lock = threading.Lock()

    @property
    def is_open(self) -> bool:
        return self._cap is not None and self._cap.isOpened()

    def open(self) -> None:
        with self._lock:
            self._ensure_open()

    def frames(self, count: int, flush: int = 5) -> list:
        """Returns `count` fresh frames, discarding buffered ones first."""
        with self._lock:
            self._ensure_open()
            for _ in range(flush):
                self._cap.grab()
            frames = []
            for _ in range(count):
                ok, frame = self._cap.read()
                if not ok:
                    self._cap.release()
                    self._cap = None
                    self.error = f"Camera {self.index} stopped returning frames."
                    raise RuntimeError(self.error)
                frames.append(frame)
            return frames

    def _ensure_open(self) -> None:
        if self.is_open:
            return
        self._cap = open_camera(self.index, self.width, self.height)
        if not self._cap.isOpened():
            self._cap = None
            self.error = f"Could not open camera {self.index}. Check CAMERA_INDEX in backend/.env."
            raise RuntimeError(self.error)
        self.error = None


def count_compartment(
    camera: Camera, model_id: str, confidence: float, day: int, frame_count: int
) -> tuple[dict[str, int], int]:
    """Runs the model on several frames and returns (counts per class in `day`'s compartment,
    pills outside every compartment). Each count is the most common value across frames,
    which filters out single-frame misses from glare or hands passing through.
    Saves the last annotated frame to last_verify.jpg for debugging."""
    session = requests.Session()
    day_history: list[Counter] = []
    outside_history: list[Counter] = []
    regions = None
    frame = predictions = None

    for frame in camera.frames(frame_count):
        if frame.shape[1] > MAX_SEND_WIDTH:
            scale = MAX_SEND_WIDTH / frame.shape[1]
            frame = cv2.resize(frame, None, fx=scale, fy=scale)
        if regions is None:
            regions = load_regions(frame.shape[1], frame.shape[0])

        _, jpg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        predictions = infer_bytes(model_id, jpg.tobytes(), confidence, session, timeout=30).get("predictions", [])
        per_day, outside = assign_to_regions(predictions, regions)
        day_history.append(per_day.get(day, Counter()))
        outside_history.append(Counter({"outside": len(outside)}))

    counts = stable_counts(day_history)
    outside_count = stable_counts(outside_history).get("outside", 0)

    if frame is not None and regions is not None:
        draw_regions(frame, regions, {day: counts})
        draw_predictions(frame, predictions or [])
        cv2.imwrite(str(LAST_FRAME_PATH), frame)

    return counts, outside_count
