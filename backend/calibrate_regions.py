"""Re-measure the seven compartment openings from the camera and rewrite regions.json.

Usage:
    python calibrate_regions.py [--camera 1] [--image path.jpg] [--dry-run]

Run with the pillbox empty and in its final position. Writes calibration_debug.jpg so you can
check the detected boxes before relying on them. Compartments are assumed to be ordered
Sun, Mon, ... Sat from left to right, matching the labels on the pillbox.
"""

import argparse
import json
import sys

import cv2
import numpy as np

from regions import REGIONS_PATH

DAYS = [(7, "Sun"), (1, "Mon"), (2, "Tue"), (3, "Wed"), (4, "Thu"), (5, "Fri"), (6, "Sat")]
CANNY_THRESHOLDS = [(30, 90), (20, 60), (15, 45), (10, 30)]


def capture(camera: int, width: int, height: int):
    cap = cv2.VideoCapture(camera, cv2.CAP_DSHOW if sys.platform == "win32" else cv2.CAP_ANY)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
    frame = None
    for _ in range(15):  # let exposure settle
        ok, frame = cap.read()
        if not ok:
            frame = None
    cap.release()
    return frame


def find_openings(image) -> list[tuple[int, int, int, int]]:
    """Finds compartment-sized rectangles, merging results across edge thresholds."""
    h_img, w_img = image.shape[:2]
    scale = w_img / 1920
    min_w, max_w, min_h, max_h = 120 * scale, 260 * scale, 150 * scale, 300 * scale
    blur = cv2.GaussianBlur(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), (5, 5), 0)

    found: list[tuple[int, int, int, int]] = []
    for lo, hi in CANNY_THRESHOLDS:
        edges = cv2.dilate(cv2.Canny(blur, lo, hi), np.ones((3, 3), np.uint8))
        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        boxes = sorted(
            (cv2.boundingRect(c) for c in contours),
            key=lambda b: -b[2] * b[3],
        )
        for x, y, w, h in boxes:
            if not (min_w < w < max_w and min_h < h < max_h and 1.0 < h / w < 1.6):
                continue
            cx = x + w / 2
            if all(abs(cx - (fx + fw / 2)) > 60 * scale for fx, _, fw, _ in found):
                found.append((x, y, w, h))
        if len(found) >= len(DAYS):
            break
    return sorted(found, key=lambda b: b[0])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--camera", type=int, default=1)
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--image", help="Calibrate from a saved frame instead of the camera")
    parser.add_argument("--dry-run", action="store_true", help="Don't write regions.json")
    args = parser.parse_args()

    image = cv2.imread(args.image) if args.image else capture(args.camera, args.width, args.height)
    if image is None:
        sys.exit("Could not get a frame. Check --camera or --image.")
    h_img, w_img = image.shape[:2]

    openings = find_openings(image)
    debug = image.copy()
    for x, y, w, h in openings:
        cv2.rectangle(debug, (x, y), (x + w, y + h), (0, 0, 255), 3)
    cv2.imwrite(str(REGIONS_PATH.with_name("calibration_debug.jpg")), debug)

    print(f"Frame {w_img}x{h_img}, found {len(openings)} compartment(s):")
    for (x, y, w, h), (_, label) in zip(openings, DAYS):
        print(f"  {label}: x={x} y={y} w={w} h={h}")

    if len(openings) != len(DAYS):
        sys.exit(f"Expected {len(DAYS)} compartments. Check calibration_debug.jpg; regions.json was not changed.")
    if args.dry_run:
        return

    REGIONS_PATH.write_text(json.dumps({
        "frame": {"width": w_img, "height": h_img},
        "camera": args.camera,
        "weekdayConvention": "Monday = 1 through Sunday = 7",
        "regions": [
            {"dayOfWeek": day, "label": label, "x": x, "y": y, "width": w, "height": h}
            for (x, y, w, h), (day, label) in zip(openings, DAYS)
        ],
    }, indent=2) + "\n")
    print(f"Wrote {REGIONS_PATH.name}")


if __name__ == "__main__":
    main()
