"""DoseGuard backend: the HTTP API the mobile app calls to verify a pillbox compartment.

Usage:
    python server.py

Endpoints:
    GET  /status      camera, scale, and model status
    POST /verify      verify one compartment (body: VerificationRequest, see below)
    GET  /scale       latest weight per compartment, Sunday = 1 ... Saturday = 7
    POST /scale/tare  zero the scale (body optional: {"dayOfWeek": 1-7})
    POST /leds        set an indicator LED (body: {"dayOfWeek": 1-7 or null for all,
                      "mode": "ON" | "OFF" | "BLINK" | "FAST", "durationMs": 0})

During /verify the compartment's LED blinks; afterwards it stays on for 5 s if checks passed,
or blinks fast for 10 s on a mismatch or needs-review result.

The phone must be on the same network as this laptop. Use the "App backend URL" printed at
start-up in the app, and allow the port through Windows Firewall if the phone can't connect.
"""

import json
import os
import socket
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

import uvicorn  # noqa: E402
from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from regions import REGIONS_PATH  # noqa: E402
from scale import ScaleReader  # noqa: E402
from verification import evaluate  # noqa: E402
from vision import Camera, count_compartment  # noqa: E402


def env_int(name: str, default: int) -> int:
    return int(os.environ.get(name) or default)


def env_float(name: str, default: float) -> float:
    return float(os.environ.get(name) or default)


MODEL_ID = os.environ.get("ROBOFLOW_MODEL_ID")
CAMERA_INDEX = env_int("CAMERA_INDEX", json.loads(REGIONS_PATH.read_text()).get("camera", 0))
CAMERA_WIDTH = env_int("CAMERA_WIDTH", 1920)
CAMERA_HEIGHT = env_int("CAMERA_HEIGHT", 1080)
CAMERA_FRAMES = env_int("CAMERA_FRAMES", 5)
DETECTION_CONFIDENCE = env_float("DETECTION_CONFIDENCE", 0.4)
SCALE_PORT = os.environ.get("SCALE_PORT") or None
SCALE_STABLE_SAMPLES = env_int("SCALE_STABLE_SAMPLES", 2)
SCALE_MAX_SPREAD_G = env_float("SCALE_MAX_SPREAD_G", 0.05)
SCALE_SETTLE_TIMEOUT_S = env_float("SCALE_SETTLE_TIMEOUT_S", 8)
SERVER_PORT = env_int("SERVER_PORT", 8000)

camera = Camera(CAMERA_INDEX, CAMERA_WIDTH, CAMERA_HEIGHT)
scale: ScaleReader | None = None
verify_lock = threading.Lock()


@asynccontextmanager
async def lifespan(_: FastAPI):
    global scale
    scale = ScaleReader(SCALE_PORT)
    try:
        camera.open()
    except RuntimeError as e:
        print(f"Warning: {e}")
    yield


app = FastAPI(title="DoseGuard backend", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class VerificationRequest(BaseModel):
    dayOfWeek: int = Field(ge=1, le=7, description="Sunday = 1 ... Saturday = 7")
    expectedCounts: dict[str, int]
    expectedWeightGrams: float = Field(ge=0)
    weightToleranceGrams: float = Field(gt=0)


class VerificationResponse(BaseModel):
    id: str
    dayOfWeek: int
    createdAt: str
    status: Literal["verified", "mismatch", "needs_review"]
    expectedCounts: dict[str, int]
    detectedCounts: dict[str, int] | None = None
    expectedWeightGrams: float
    measuredWeightGrams: float | None = None
    weightToleranceGrams: float
    summary: str
    details: list[str]


class TareRequest(BaseModel):
    dayOfWeek: int | None = Field(default=None, ge=1, le=7)


class LedRequest(BaseModel):
    dayOfWeek: int | None = Field(default=None, ge=1, le=7, description="null = all compartments")
    mode: Literal["ON", "OFF", "BLINK", "FAST"]
    durationMs: int = Field(default=0, ge=0, le=600_000, description="0 = until changed")


def try_set_led(day: int | None, mode: str, duration_ms: int = 0) -> None:
    """LED feedback is best-effort; a missing Arduino must not fail a verification."""
    if scale and scale.connected:
        try:
            scale.set_led(day, mode, duration_ms)
        except (RuntimeError, OSError):
            pass


def run_camera_check(day: int) -> tuple[dict[str, int] | None, int, str | None]:
    if not MODEL_ID:
        return None, 0, "ROBOFLOW_MODEL_ID is not set in backend/.env."
    try:
        counts, outside = count_compartment(camera, MODEL_ID, DETECTION_CONFIDENCE, day, CAMERA_FRAMES)
        return counts, outside, None
    except Exception as e:  # camera or inference server failure becomes "needs review"
        return None, 0, str(e)


def run_weight_check(day: int) -> tuple[float | None, str | None]:
    if scale is None:
        return None, "Scale reader is not running."
    return scale.stable_weight(day, SCALE_STABLE_SAMPLES, SCALE_MAX_SPREAD_G, SCALE_SETTLE_TIMEOUT_S)


@app.post("/verify", response_model=VerificationResponse, response_model_exclude_none=True)
def verify(request: VerificationRequest) -> VerificationResponse:
    if not verify_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="Another verification is already running.")
    try:
        try_set_led(request.dayOfWeek, "BLINK")
        with ThreadPoolExecutor(max_workers=2) as pool:
            camera_job = pool.submit(run_camera_check, request.dayOfWeek)
            weight_job = pool.submit(run_weight_check, request.dayOfWeek)
            detected, outside, camera_error = camera_job.result()
            measured, scale_error = weight_job.result()
    finally:
        verify_lock.release()

    outcome = evaluate(
        expected_counts=request.expectedCounts,
        expected_weight=request.expectedWeightGrams,
        tolerance=request.weightToleranceGrams,
        detected_counts=detected,
        camera_error=camera_error,
        outside_count=outside,
        measured_weight=measured,
        scale_error=scale_error,
    )
    if outcome["status"] == "verified":
        try_set_led(request.dayOfWeek, "ON", 5000)
    else:
        try_set_led(request.dayOfWeek, "FAST", 10000)

    return VerificationResponse(
        id=f"ver-{uuid.uuid4().hex[:12]}",
        dayOfWeek=request.dayOfWeek,
        createdAt=datetime.now(timezone.utc).isoformat(),
        expectedCounts=request.expectedCounts,
        detectedCounts=detected,
        expectedWeightGrams=request.expectedWeightGrams,
        measuredWeightGrams=measured,
        weightToleranceGrams=request.weightToleranceGrams,
        **outcome,
    )


@app.get("/status")
def status() -> dict:
    return {
        "backend": "ok",
        "camera": {"index": CAMERA_INDEX, "open": camera.is_open, "error": camera.error},
        "scale": {
            "connected": bool(scale and scale.connected),
            "port": scale.port if scale else None,
            "weightsGrams": scale.latest() if scale else None,
            "error": scale.error if scale else None,
        },
        "model": {"configured": bool(MODEL_ID)},
    }


@app.get("/scale")
def scale_readings() -> dict:
    if not scale or not scale.connected:
        raise HTTPException(status_code=503, detail=(scale and scale.error) or "Scale is not connected.")
    return {"weightsGrams": scale.latest()}


@app.post("/scale/tare")
def tare(request: TareRequest | None = None) -> dict:
    if not scale or not scale.connected:
        raise HTTPException(status_code=503, detail=(scale and scale.error) or "Scale is not connected.")
    day = request.dayOfWeek if request else None
    if not scale.tare(day):
        raise HTTPException(status_code=504, detail="The Arduino did not confirm the tare.")
    return {"ok": True, "dayOfWeek": day}


@app.post("/leds")
def set_leds(request: LedRequest) -> dict:
    if not scale or not scale.connected:
        raise HTTPException(status_code=503, detail=(scale and scale.error) or "Arduino is not connected.")
    scale.set_led(request.dayOfWeek, request.mode, request.durationMs)
    return {"ok": True}


def lan_ip() -> str:
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        try:
            s.connect(("10.255.255.255", 1))
            return s.getsockname()[0]
        except OSError:
            return "127.0.0.1"


if __name__ == "__main__":
    print(f"App backend URL: http://{lan_ip()}:{SERVER_PORT}")
    uvicorn.run(app, host="0.0.0.0", port=SERVER_PORT)
