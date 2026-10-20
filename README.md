# Dose Guard

**A weekly pillbox that checks the refill.**

Dose Guard helps verify a seven-day pillbox after you fill it. A camera counts pills by their recognized class, load cells weigh each day's compartment, and a mobile app shows whether the contents match the configured schedule.

> **Prototype status:** The hardware, sensor backend, and mobile app have been developed. Connecting the in-app Verify screen to the backend remains in progress.
>
> A passing result means the configured pill counts and weight matched. It does **not** guarantee medication safety.

## Inspiration

Weekly pillboxes are supposed to make medication simpler. The risk moves to refill time: the wrong pill, the wrong count, or an empty Thursday can sit there until someone takes the dose.

We wanted a check that happens when the box is filled. Dose Guard is not a robot that dispenses pills. It is a familiar weekly pillbox designed to help answer one question: **does this day contain what the schedule expects?**

## How It Works

1. **Build the week.** Add medications in the app by typing them in or scanning a demo barcode. Select days, dose times, and pills per dose. Each compartment holds one full day's pills.
2. **Fill a compartment.** The app shows the expected contents for that day, including pill counts and total weight.
3. **Run verification.** The laptop backend blinks that day's LED, then runs the camera and scale checks concurrently. The in-app trigger for this step is still being connected.
4. **Review the result.** The backend combines both checks into a single decision.

| Result | Meaning |
| --- | --- |
| **Verified** | Both checks ran and matched the expected contents. |
| **Mismatch** | At least one completed check found a pill-count or weight disagreement. |
| **Needs review** | No completed check found a disagreement, but at least one sensor check could not run. |

A mismatch takes priority over an unavailable sensor. An unavailable sensor can never produce a verified result.

### Supported Pill Classes

The current vision model recognizes three classes:

- Vitamin B12
- Vitamin D3
- Ibuprofen

## System Architecture

The prototype has three layers connected through USB and the local network.

| Layer | Responsibilities | Technologies |
| --- | --- | --- |
| **Hardware** | Weigh each compartment, indicate the selected day, and capture overhead images. | Arduino Mega, load cells with HX711 amplifiers, LEDs, webcam |
| **Laptop backend** | Control sensors, run local vision inference, compare measurements, and return one decision. | Python, FastAPI, OpenCV, pyserial, Roboflow YOLO |
| **Mobile app** | Manage medications and schedules, calculate expected contents, and store verification history locally. | Expo, React Native, TypeScript, Expo Router, Expo Camera |

### Hardware

- Seven-day pillbox with one compartment per weekday
- Arduino Mega
- Seven load cells with HX711 amplifiers, one under each day's compartment
- Seven indicator LEDs
- Overhead webcam with a fixed rectangular region mapped to each compartment

### Laptop Backend

The Python/FastAPI backend:

- Keeps the webcam open and communicates with the Mega over serial.
- Sends frames to a local Roboflow YOLO inference server.
- Votes across multiple frames so a single glare or passing hand does not determine the count.
- Waits for load-cell readings to settle before comparing them with the expected weight.
- Uses a weight tolerance of **±0.06 g**.
- Combines camera and scale results into one decision for the app to display.

### Mobile App

The Expo/React Native app includes:

- Home, medication, weekly pillbox, and per-day result screens
- Medication schedules with days, dose times, and pills per dose
- Expected pill counts and weights calculated from the schedule
- On-device medication and verification-history storage
- Results marked **outdated** when the relevant schedule changes after a check

The phone owns the schedule; the backend owns sensor verification. The in-app Verify connection, history experience, and device settings are still being completed.

## Why Two Sensors?

The camera can recognize a pill class but miss a pill under glare or overlap. The scale cannot identify a pill, but it can detect missing or extra mass.

Dose Guard only returns **Verified** when both checks actually run and match. When one check disagrees, the result is **Mismatch**. When neither disagrees but a check is unavailable, the result is **Needs review**.

## Challenges

### Tiny Mass, Noisy Readings

A pill can weigh a fraction of a gram. Each load cell needed calibration and an empty-bin tare. The backend waits until several samples agree before accepting a reading.

### Vision Inside a Real Pillbox

White pills, shiny plastic, and hands in the frame can confuse a single snapshot. Multi-frame voting and fixed compartment regions helped. The camera still needs to remain in the position used during region calibration.

### Independent Sensors, One Decision

The camera and scale can fail independently. Verification logic must distinguish a measurement disagreement from an unavailable check, and neither condition can silently become a pass.

### Keeping Results Current

A successful check applies to the schedule used for that check. If the schedule changes, the previous result is marked outdated.

## Accomplishments

- Built hardware and backend verification for comparing a day's expected contents with camera and scale readings.
- Implemented decision logic that requires both checks to pass before returning **Verified**.
- Developed firmware, load-cell calibration sketches, camera-region calibration, and a live camera preview.
- Built an app that turns a medication list into a weekly filling guide.

## What We Learned

- **Verification is a product decision.** Deciding when to pass, flag a mismatch, or request review matters as much as the model.
- **Hardware takes calibration.** Load-cell factors, camera regions, lighting, and a stable box all affect results.
- **Different sensors provide different evidence.** Their disagreements can reveal problems that either sensor alone would miss.

## Current Limitations

- The vision model supports only the three listed pill classes.
- The camera must stay in its calibrated position.
- Expected weights currently use hard-coded grams-per-pill values.
- The in-app Verify screen is not yet fully connected to the backend.
- Matching counts and weight does not guarantee correct medication identity or medication safety.

## Roadmap

- [ ] Connect the in-app Verify screen to the backend.
- [ ] Finish verification history and device settings.
- [ ] Add backend URL configuration, tare controls, and camera/scale status.
- [ ] Support more pill classes.
- [ ] Improve lighting and build a fixed enclosure.
- [ ] Measure a reference pill from the bottle instead of relying on hard-coded weights.
- [ ] Add a caregiver view of the week.

## Built With

- **App:** Expo, React Native, TypeScript, Expo Router, Expo Camera
- **Backend:** Python, FastAPI, OpenCV, pyserial
- **Vision:** Roboflow, YOLO, local inference server
- **Hardware and firmware:** Arduino Mega, load cells, HX711 amplifiers, LEDs, webcam
