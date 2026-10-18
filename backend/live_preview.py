"""Live webcam preview: runs each frame through the local Roboflow Inference server.

Usage:
    python live_preview.py [--camera 1] [--confidence 0.4] [--smooth 10]
    python live_preview.py --list-cameras

Keys in the preview window:
    o      toggle the compartment-region overlay (use it to line up the camera and pillbox)
    s      save the current annotated frame
    q/Esc  quit

Each detection is assigned to the weekday region (regions.json) containing its box center.
Counts shown are the most common count per region and class over the last --smooth frames,
which filters out single-frame misses from glare or hands passing through.
"""

import argparse
import os
import sys
import time
from collections import Counter, deque

import cv2
import requests

from regions import assign_to_regions, draw_regions, load_regions
from test_inference import draw_predictions, infer_bytes

OUTSIDE = 0

MAX_SEND_WIDTH = 1280


def open_camera(index: int, width: int | None = None, height: int | None = None) -> cv2.VideoCapture:
    backend = cv2.CAP_DSHOW if sys.platform == "win32" else cv2.CAP_ANY
    cap = cv2.VideoCapture(index, backend)
    # DirectShow defaults to 640x480 unless a size is requested; the camera picks its closest mode.
    if width and height:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
    return cap


def list_cameras(max_index: int = 6) -> None:
    for i in range(max_index):
        cap = open_camera(i)
        ok, frame = cap.read() if cap.isOpened() else (False, None)
        if ok:
            h, w = frame.shape[:2]
            print(f"camera {i}: {w}x{h}")
        cap.release()


def stable_counts(history: deque) -> dict:
    keys = {k for counts in history for k in counts}
    stable = {k: Counter(counts.get(k, 0) for counts in history).most_common(1)[0][0] for k in sorted(keys)}
    return {k: n for k, n in stable.items() if n}


def frame_counts(predictions: list, regions) -> Counter:
    """Counts keyed by (dayOfWeek, class); detections outside every region use day OUTSIDE."""
    per_day, outside = assign_to_regions(predictions, regions)
    counts = Counter({(day, cls): n for day, classes in per_day.items() for cls, n in classes.items()})
    counts.update((OUTSIDE, p["class"]) for p in outside)
    return counts


def draw_overlay(frame, lines: list[str]) -> None:
    y = 28
    for line in lines:
        cv2.putText(frame, line, (12, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 4)
        cv2.putText(frame, line, (12, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        y += 28


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--camera", type=int, default=1, help="Camera index (see --list-cameras)")
    parser.add_argument("--width", type=int, default=1920, help="Match the size regions.json was calibrated at")
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--model", default=os.environ.get("ROBOFLOW_MODEL_ID"))
    parser.add_argument("--confidence", type=float, default=0.4)
    parser.add_argument("--smooth", type=int, default=10, help="Frames used for stable counts")
    parser.add_argument("--list-cameras", action="store_true")
    args = parser.parse_args()

    if args.list_cameras:
        list_cameras()
        return
    if not args.model:
        sys.exit("No model ID. Set ROBOFLOW_MODEL_ID in backend/.env or pass --model.")

    cap = open_camera(args.camera, args.width, args.height)
    if not cap.isOpened():
        sys.exit(f"Could not open camera {args.camera}. Try --list-cameras.")
    print(f"Camera {args.camera}: {int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x{int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}")

    session = requests.Session()
    history: deque = deque(maxlen=args.smooth)
    regions = None
    show_regions = True
    last_time = time.perf_counter()
    fps = 0.0

    print("Running. Press o to toggle regions, s to save a frame, q to quit.")
    while True:
        ok, frame = cap.read()
        if not ok:
            print("Camera stopped returning frames.")
            break

        if frame.shape[1] > MAX_SEND_WIDTH:
            scale = MAX_SEND_WIDTH / frame.shape[1]
            frame = cv2.resize(frame, None, fx=scale, fy=scale)
        if regions is None:
            regions = load_regions(frame.shape[1], frame.shape[0])

        _, jpg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        predictions = infer_bytes(args.model, jpg.tobytes(), args.confidence, session, timeout=30).get(
            "predictions", []
        )

        history.append(frame_counts(predictions, regions))
        stable = stable_counts(history)
        per_day: dict[int, dict[str, int]] = {}
        for (day, cls), n in stable.items():
            per_day.setdefault(day, {})[cls] = n
        outside_total = sum(per_day.pop(OUTSIDE, {}).values())

        now = time.perf_counter()
        fps = 0.9 * fps + 0.1 * (1 / max(now - last_time, 1e-6)) if fps else 1 / max(now - last_time, 1e-6)
        last_time = now

        if show_regions:
            draw_regions(frame, regions, per_day)
        draw_predictions(frame, predictions)
        lines = [f"{fps:.1f} FPS   regions: {'on' if show_regions else 'off'} (o)"]
        if not per_day:
            lines.append("no pills in any compartment")
        if outside_total:
            lines.append(f"{outside_total} pill(s) outside all compartments")
        draw_overlay(frame, lines)
        cv2.imshow("DoseGuard live preview", frame)

        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), 27):
            break
        if key == ord("o"):
            show_regions = not show_regions
        if key == ord("s"):
            path = f"frame_{int(time.time())}.jpg"
            cv2.imwrite(os.path.join(os.path.dirname(__file__), path), frame)
            labels = {r.day_of_week: r.label for r in regions}
            print(f"Saved {path}  per-day counts: { {labels[d]: c for d, c in per_day.items()} }")

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
