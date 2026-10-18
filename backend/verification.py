"""Combines camera counts and load-cell weight into one verification result.

Status rules:
    mismatch      camera counts disagree with what was expected
    needs_review  camera could not run (weight alone is not enough)
    verified      camera counts matched; weight is recorded but does not fail the check
"""

LABELS = {"B12": "Vitamin B12", "D3": "Vitamin D3", "Ibuprofen": "Ibuprofen"}


def label(model_class: str) -> str:
    return LABELS.get(model_class, model_class)


def pills(n: int) -> str:
    return "pill" if n == 1 else "pills"


def evaluate(
    expected_counts: dict[str, int],
    expected_weight: float,
    tolerance: float,
    detected_counts: dict[str, int] | None,
    camera_error: str | None,
    outside_count: int,
    measured_weight: float | None,
    scale_error: str | None,
) -> dict:
    """Returns status, summary, and details. `detected_counts` / `measured_weight` are None
    when that check could not run; the matching *_error explains why."""
    problems: list[str] = []
    unavailable: list[str] = []
    notes: list[str] = []

    if detected_counts is None:
        unavailable.append(f"Camera check could not run: {camera_error}")
    else:
        for cls in sorted(set(expected_counts) | set(detected_counts), key=label):
            expected = expected_counts.get(cls, 0)
            detected = detected_counts.get(cls, 0)
            if detected < expected:
                n = expected - detected
                problems.append(f"{n} {label(cls)} {pills(n)} missing")
            elif detected > expected:
                n = detected - expected
                problems.append(f"{n} extra {label(cls)} {pills(n)}")
        if not problems:
            notes.append("Camera counts matched.")
        if outside_count:
            notes.append(
                f"{outside_count} {pills(outside_count)} detected outside every compartment; "
                "check that the pillbox is in its calibrated position."
            )

    camera_matched = detected_counts is not None and not problems

    if measured_weight is None:
        note = f"Weight check could not run: {scale_error}"
        if camera_matched:
            notes.append(note + " Camera counts matched, so this check still passed.")
        else:
            unavailable.append(note)
    else:
        diff = measured_weight - expected_weight
        if abs(diff) > tolerance:
            weight_note = (
                f"Weight {abs(diff):.2f} g {'over' if diff > 0 else 'under'} the expected "
                f"{expected_weight:.2f} g (allowed ±{tolerance:.2f} g)"
            )
            if camera_matched:
                notes.append(weight_note + ". Camera counts matched, so this check still passed.")
            else:
                problems.append(weight_note)
        else:
            notes.append(
                f"Weight {measured_weight:.2f} g is within ±{tolerance:.2f} g of the expected "
                f"{expected_weight:.2f} g."
            )

    if problems:
        status = "mismatch"
        extra = len(problems) - 1
        summary = problems[0] + (f", and {extra} more {'issue' if extra == 1 else 'issues'}." if extra else ".")
    elif unavailable:
        status = "needs_review"
        if detected_counts is None and measured_weight is None:
            summary = "Camera and weight checks unavailable."
        elif detected_counts is None:
            summary = "Camera check unavailable."
        else:
            summary = "Weight reading unavailable."
    else:
        status = "verified"
        summary = "Checks passed."

    details = [line if line.endswith(".") else line + "." for line in problems + unavailable + notes]
    return {"status": status, "summary": summary, "details": details}
