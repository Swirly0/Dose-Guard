"""Send one image to the local Roboflow Inference server and print per-class pill counts.

Usage:
    python test_inference.py <image_path> [--model MODEL_ID] [--confidence 0.4] [--save out.jpg]

Configuration is read from backend/.env (see .env.example):
    ROBOFLOW_API_KEY       required
    ROBOFLOW_MODEL_ID      used when --model is not passed
    INFERENCE_SERVER_URL   defaults to http://localhost:9001
"""

import argparse
import base64
import os
import sys
from collections import Counter
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

SERVER_URL = os.environ.get("INFERENCE_SERVER_URL", "http://localhost:9001").rstrip("/")


class InferenceError(RuntimeError):
    pass


def get_api_key() -> str:
    key = os.environ.get("ROBOFLOW_API_KEY")
    if not key:
        raise InferenceError("ROBOFLOW_API_KEY is not set. Add it to backend/.env.")
    return key


def infer_bytes(
    model_id: str,
    image_bytes: bytes,
    confidence: float,
    session: requests.Session | None = None,
    timeout: float = 300,
) -> dict:
    response = (session or requests).post(
        f"{SERVER_URL}/{model_id}",
        params={"api_key": get_api_key(), "confidence": confidence},
        data=base64.b64encode(image_bytes).decode("ascii"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=timeout,
    )
    if not response.ok:
        raise InferenceError(f"Inference server returned {response.status_code}: {response.text}")
    return response.json()


def infer(model_id: str, image_path: str, confidence: float) -> dict:
    with open(image_path, "rb") as f:
        return infer_bytes(model_id, f.read(), confidence)


def draw_predictions(image, predictions: list) -> None:
    import cv2

    for p in predictions:
        x1, y1 = int(p["x"] - p["width"] / 2), int(p["y"] - p["height"] / 2)
        x2, y2 = int(p["x"] + p["width"] / 2), int(p["y"] + p["height"] / 2)
        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 200, 0), 2)
        label = f'{p["class"]} {p["confidence"]:.2f}'
        cv2.putText(image, label, (x1, max(y1 - 6, 12)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 200, 0), 2)


def save_annotated(image_path: str, predictions: list, out_path: str) -> None:
    import cv2

    image = cv2.imread(image_path)
    draw_predictions(image, predictions)
    cv2.imwrite(out_path, image)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("image_path")
    parser.add_argument(
        "--model",
        default=os.environ.get("ROBOFLOW_MODEL_ID"),
        help="Roboflow model ID (defaults to ROBOFLOW_MODEL_ID)",
    )
    parser.add_argument("--confidence", type=float, default=0.4)
    parser.add_argument("--save", help="Write an annotated copy of the image to this path")
    args = parser.parse_args()

    if not args.model:
        sys.exit("No model ID. Set ROBOFLOW_MODEL_ID in backend/.env or pass --model.")

    try:
        result = infer(args.model, args.image_path, args.confidence)
    except InferenceError as e:
        sys.exit(str(e))
    predictions = result.get("predictions", [])

    for p in predictions:
        print(f'{p["class"]:<20} conf={p["confidence"]:.2f}  box=({p["x"]:.0f}, {p["y"]:.0f}, {p["width"]:.0f}x{p["height"]:.0f})')

    counts = Counter(p["class"] for p in predictions)
    print(f"\nDetected {len(predictions)} pill(s):", dict(counts) or "none")

    if args.save:
        save_annotated(args.image_path, predictions, args.save)
        print(f"Annotated image saved to {args.save}")


if __name__ == "__main__":
    main()
