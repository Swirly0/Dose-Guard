#include "HX711.h"

const byte NUM_SENSORS = 7;

const byte DOUT_PINS[7] = {22, 24, 26, 44, 46, 48, 50};
const byte SCK_PINS[7]  = {23, 25, 27, 45, 47, 49, 51};

const char* DAY_NAMES[NUM_SENSORS] = {
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday"
};

const float KNOWN_MASS_G = 0.25; // Change to the mass you actually use

HX711 scales[NUM_SENSORS];
float calibrationFactors[NUM_SENSORS];

void waitForUser() {
  while (Serial.available() == 0) {
    delay(10);
  }

  while (Serial.available() > 0) {
    Serial.read();
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  for (byte i = 0; i < NUM_SENSORS; i++) {
    scales[i].begin(DOUT_PINS[i], SCK_PINS[i]);
  }

  Serial.println("Waiting for all HX711 boards...");
  for (byte i = 0; i < NUM_SENSORS; i++) {
    while (!scales[i].is_ready()) {
      delay(100);
    }
  }

  Serial.println("Leave all seven empty bins on their load cells.");
  Serial.println("Taring in 3 seconds...");
  delay(3000);

  for (byte i = 0; i < NUM_SENSORS; i++) {
    scales[i].tare(20);
  }

  Serial.println("All seven bins tared.");
  Serial.println("For each prompt, place the known mass on that bin,");
  Serial.println("then type c and press Send.");

  for (byte i = 0; i < NUM_SENSORS; i++) {
    Serial.println();
    Serial.print("Place the ");
    Serial.print(KNOWN_MASS_G, 2);
    Serial.print(" g mass on the ");
    Serial.print(DAY_NAMES[i]);
    Serial.println(" bin, then send c.");

    waitForUser();
    delay(1000); // Let the mass settle

    float rawReading = scales[i].get_value(20);
    calibrationFactors[i] = rawReading / KNOWN_MASS_G;

    Serial.print(DAY_NAMES[i]);
    Serial.print(" raw reading: ");
    Serial.println(rawReading, 2);

    Serial.print(DAY_NAMES[i]);
    Serial.print(" calibration factor: ");
    Serial.println(calibrationFactors[i], 6);

    Serial.println("Remove the mass, then send c to continue.");
    waitForUser();
  }

  Serial.println();
  Serial.println("Copy these factors into the weighing sketch:");
  Serial.print("{");

  for (byte i = 0; i < NUM_SENSORS; i++) {
    Serial.print(calibrationFactors[i], 6);
    if (i < NUM_SENSORS - 1) {
      Serial.print(", ");
    }
  }

  Serial.println("}");
  Serial.println("Calibration finished.");
}

void loop() {
}
