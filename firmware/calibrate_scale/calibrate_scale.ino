/*
  Calibrate one DoseGuard load cell.

  1. Set CELL to the compartment to calibrate (1 = Monday ... 7 = Sunday).
  2. Set KNOWN_MASS_G to the mass of your reference weight.
  3. Upload, open the Serial Monitor at 115200, and follow the prompts.
  4. Copy the printed factor into CALIBRATION_FACTORS in doseguard_scale.ino.

  After calibrating, the sketch keeps printing live readings so you can check the factor.
*/

#include "HX711.h"

const int CELL = 1;              // 1 = Monday ... 7 = Sunday
const float KNOWN_MASS_G = 9.0;  // mass of your reference weight

// Keep in sync with doseguard_scale.ino.
const int DOUT_PINS[7] = {3, 22, 24, 26, 28, 30, 32};
const int SCK_PINS[7]  = {2, 23, 25, 27, 29, 31, 33};

HX711 scale;

void setup() {
  Serial.begin(115200);
  scale.begin(DOUT_PINS[CELL - 1], SCK_PINS[CELL - 1]);

  Serial.print("Calibrating compartment ");
  Serial.println(CELL);
  Serial.println("Waiting for HX711...");
  while (!scale.is_ready()) {
    delay(500);
  }

  Serial.println("Keep the empty bin on the load cell.");
  delay(3000);
  scale.tare(20);

  Serial.print("Place the ");
  Serial.print(KNOWN_MASS_G);
  Serial.println(" g reference mass in the bin now.");
  delay(5000);

  float rawReading = scale.get_value(20);
  float calibrationFactor = rawReading / KNOWN_MASS_G;
  scale.set_scale(calibrationFactor);

  Serial.print("Raw reading: ");
  Serial.println(rawReading);
  Serial.print("Calibration factor for compartment ");
  Serial.print(CELL);
  Serial.print(": ");
  Serial.println(calibrationFactor, 2);
  Serial.println("Live readings (should show the reference mass):");
}

void loop() {
  Serial.print(scale.get_units(10), 3);
  Serial.println(" g");
  delay(300);
}
