#include "HX711.h"

const byte NUM_BINS = 7;

// Sunday through Saturday
const char* DAY_NAMES[NUM_BINS] = {
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday"
};

// HX711 connections: DOUT, SCK
const byte DOUT_PINS[NUM_BINS] = {22, 24, 26, 44, 46, 48, 50};
const byte SCK_PINS[NUM_BINS]  = {23, 25, 27, 45, 47, 49, 51};

// LEDs: Sunday through Saturday
const byte LED_PINS[NUM_BINS] = {28, 29, 30, 31, 32, 33, 34};

// Replace these example values with the calibration factors
// printed by the calibration sketch, in Sunday-to-Saturday order.
float CALIBRATION_FACTORS[NUM_BINS] = {
  23584.000000, -180.000000, 2616.000000, 16.000000, 36348.000000, -1124.000000, 16820.000000
};

// Pill weights in grams
const float B12_G       = 0.26f;
const float D3_G        = 0.17f;
const float IBUPROFEN_G = 0.33f;

// Example expected pill counts per bin, Sunday through Saturday.
// Change these counts to match your schedule.
const byte B12_COUNT[NUM_BINS]       = {1, 1, 0, 1, 0, 1, 0};
const byte D3_COUNT[NUM_BINS]        = {1, 0, 1, 1, 0, 1, 1};
const byte IBUPROFEN_COUNT[NUM_BINS] = {0, 2, 0, 0, 2, 0, 1};

// The target weight is calculated from the pill counts above.
float weightLimit_g[NUM_BINS];

// LED stays on until the measured weight is within this amount
// of the target. Adjust this after testing your sensors.
const float WEIGHT_TOLERANCE_G = 0.03f;

// Number of HX711 readings to average per measurement
const byte READINGS_TO_AVERAGE = 10;

HX711 scales[NUM_BINS];

void calculateWeightLimits() {
  for (byte i = 0; i < NUM_BINS; i++) {
    weightLimit_g[i] =
        (B12_COUNT[i] * B12_G) +
        (D3_COUNT[i] * D3_G) +
        (IBUPROFEN_COUNT[i] * IBUPROFEN_G);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  calculateWeightLimits();

  for (byte i = 0; i < NUM_BINS; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], HIGH); // Start with LEDs on

    scales[i].begin(DOUT_PINS[i], SCK_PINS[i]);
    scales[i].set_scale(CALIBRATION_FACTORS[i]);
  }

  Serial.println("Waiting for all HX711 boards...");
  for (byte i = 0; i < NUM_BINS; i++) {
    while (!scales[i].is_ready()) {
      delay(10);
    }
  }

  Serial.println("Make sure all bins are empty and installed.");
  Serial.println("Taring all bins now...");
  delay(1500);

  for (byte i = 0; i < NUM_BINS; i++) {
    scales[i].tare(20);
  }

  Serial.println("Tare complete.");
  Serial.println("Day,Weight_g,Target_g,LED");
}

void loop() {
  for (byte i = 0; i < NUM_BINS; i++) {
    if (!scales[i].is_ready()) {
      Serial.print(DAY_NAMES[i]);
      Serial.println(": HX711 not ready; check its wiring.");
      continue;
    }

    // get_units() returns grams after set_scale() and tare().
    float measuredWeight_g = scales[i].get_units(READINGS_TO_AVERAGE);

    // Keep the LED on until the measured weight reaches the target,
    // allowing for the configured tolerance.
    bool targetReached =
        measuredWeight_g >= (weightLimit_g[i] - WEIGHT_TOLERANCE_G);

    digitalWrite(LED_PINS[i], targetReached ? LOW : HIGH);

    Serial.print(DAY_NAMES[i]);
    Serial.print(",");
    Serial.print(measuredWeight_g, 2);
    Serial.print(",");
    Serial.print(weightLimit_g[i], 2);
    Serial.print(",");
    Serial.println(targetReached ? "OFF" : "ON");
  }

  Serial.println();
  delay(500);
}
