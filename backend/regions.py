"""Compartment regions: which part of the camera frame belongs to which weekday.

Regions are stored in regions.json in pixels of the calibration frame size and scaled to the
live frame, so the camera must keep the same aspect ratio and position it was calibrated at.
A detection belongs to a region when its box center falls inside that region.
"""

import json
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import cv2

REGIONS_PATH = Path(__file__).with_name("regions.json")


@dataclass
class Region:
    day_of_week: int
    label: str
    x: int
    y: int
    width: int
    height: int

    def contains(self, px: float, py: float) -> bool:
        return self.x <= px <= self.x + self.width and self.y <= py <= self.y + self.height


def load_regions(frame_width: int, frame_height: int, path: Path = REGIONS_PATH) -> list[Region]:
    data = json.loads(path.read_text())
    sx = frame_width / data["frame"]["width"]
    sy = frame_height / data["frame"]["height"]
    return [
        Region(
            day_of_week=r["dayOfWeek"],
            label=r["label"],
            x=round(r["x"] * sx),
            y=round(r["y"] * sy),
            width=round(r["width"] * sx),
            height=round(r["height"] * sy),
        )
        for r in data["regions"]
    ]


def assign_to_regions(predictions: list, regions: list[Region]) -> tuple[dict[int, Counter], list]:
    """Returns per-day class counts and the predictions that fell outside every region."""
    per_day = {r.day_of_week: Counter() for r in regions}
    outside = []
    for p in predictions:
        region = next((r for r in regions if r.contains(p["x"], p["y"])), None)
        if region:
            per_day[region.day_of_week][p["class"]] += 1
        else:
            outside.append(p)
    return per_day, outside


def draw_regions(frame, regions: list[Region], per_day: dict[int, dict[str, int]] | None = None) -> None:
    fill = frame.copy()
    for r in regions:
        has_pills = bool(per_day and sum(per_day.get(r.day_of_week, {}).values()))
        color = (0, 200, 0) if has_pills else (255, 170, 0)
        cv2.rectangle(fill, (r.x, r.y), (r.x + r.width, r.y + r.height), color, -1)
    cv2.addWeighted(fill, 0.18, frame, 0.82, 0, dst=frame)

    for r in regions:
        counts = (per_day or {}).get(r.day_of_week, {})
        color = (0, 200, 0) if sum(counts.values()) else (255, 170, 0)
        cv2.rectangle(frame, (r.x, r.y), (r.x + r.width, r.y + r.height), color, 2)
        cv2.putText(frame, r.label, (r.x + 6, r.y + 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        for i, (cls, n) in enumerate(sorted(counts.items())):
            cv2.putText(
                frame, f"{cls}: {n}", (r.x + 6, r.y + r.height + 22 + i * 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2,
            )
