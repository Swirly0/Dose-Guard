/*
  DoseGuard scale firmware (Arduino Mega + 7 HX711 load cells).

  Serial protocol, 115200 baud, one message per line:

    Arduino -> laptop
      READY                         sent once after start-up tare
      W g1 g2 g3 g4 g5 g6 g7        grams per compartment, Monday = 1 ... Sunday = 7,
                                    sent every REPORT_INTERVAL_MS; "nan" = no reading
      PONG                          reply to PING
      OK TARE                       tare finished
      ERR <message>

    Laptop -> Arduino
      PING
      TARE          zero all compartments (empty bins in place)
      TARE <1-7>    zero one compartment

  Each HX711 has its own DOUT/SCK pair. All boards convert in parallel; the loop reads
  whichever is ready and averages the samples collected since the last report.
*/

#include "HX711.h"

const int NUM_CELLS = 7;

// Index 0 = Monday ... index 6 = Sunday. Keep in sync with calibrate_scale.ino.
const int DOUT_PINS[NUM_CELLS] = {3, 22, 24, 26, 28, 30, 32};
const int SCK_PINS[NUM_CELLS]  = {2, 23, 25, 27, 29, 31, 33};

// Counts per gram for each load cell; measure each one with calibrate_scale.ino.
const float CALIBRATION_FACTORS[NUM_CELLS] = {
  645.89, 645.89, 645.89, 645.89, 645.89, 645.89, 645.89,
};

const unsigned long REPORT_INTERVAL_MS = 400;
const unsigned long STALE_AFTER_MS = 1500;   // report "nan" if a cell stops responding
const int TARE_SAMPLES = 15;
const unsigned long TARE_TIMEOUT_MS = 4000;

HX711 scales[NUM_CELLS];
float sampleSum[NUM_CELLS];
int sampleCount[NUM_CELLS];
float lastGrams[NUM_CELLS];
unsigned long lastSampleAt[NUM_CELLS];
unsigned long lastReportAt = 0;

char commandBuffer[32];
byte commandLength = 0;

// Tares the cells whose bit is set in `mask`, sampling them in parallel.
void tareCells(byte mask) {
  long sums[NUM_CELLS] = {0};
  int counts[NUM_CELLS] = {0};
  unsigned long start = millis();
  bool done = false;

  while (!done && millis() - start < TARE_TIMEOUT_MS) {
    done = true;
    for (int i = 0; i < NUM_CELLS; i++) {
      if (!(mask & (1 << i)) || counts[i] >= TARE_SAMPLES) continue;
      done = false;
      if (scales[i].is_ready()) {
        sums[i] += scales[i].read();
        counts[i]++;
      }
    }
  }

  for (int i = 0; i < NUM_CELLS; i++) {
    if ((mask & (1 << i)) && counts[i] > 0) {
      scales[i].set_offset(sums[i] / counts[i]);
      sampleSum[i] = 0;
      sampleCount[i] = 0;
    }
  }
}

void handleCommand(char *cmd) {
  if (strcmp(cmd, "PING") == 0) {
    Serial.println("PONG");
  } else if (strcmp(cmd, "TARE") == 0) {
    tareCells(0x7F);
    Serial.println("OK TARE");
  } else if (strncmp(cmd, "TARE ", 5) == 0) {
    int day = atoi(cmd + 5);
    if (day < 1 || day > NUM_CELLS) {
      Serial.println("ERR compartment must be 1-7");
      return;
    }
    tareCells(1 << (day - 1));
    Serial.println("OK TARE");
  } else if (commandLength > 0) {
    Serial.print("ERR unknown command: ");
    Serial.println(cmd);
  }
}

void readCommands() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      commandBuffer[commandLength] = '\0';
      for (byte i = 0; i < commandLength; i++) commandBuffer[i] = toupper(commandBuffer[i]);
      handleCommand(commandBuffer);
      commandLength = 0;
    } else if (commandLength < sizeof(commandBuffer) - 1) {
      commandBuffer[commandLength++] = c;
    }
  }
}

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < NUM_CELLS; i++) {
    scales[i].begin(DOUT_PINS[i], SCK_PINS[i]);
    scales[i].set_scale(CALIBRATION_FACTORS[i]);
    lastGrams[i] = NAN;
    lastSampleAt[i] = 0;
  }
  delay(500);          // let the HX711s power up
  tareCells(0x7F);     // tare with the empty bins in place
  Serial.println("READY");
}

void loop() {
  readCommands();

  unsigned long now = millis();
  for (int i = 0; i < NUM_CELLS; i++) {
    if (scales[i].is_ready()) {
      sampleSum[i] += scales[i].get_units(1);
      sampleCount[i]++;
      lastSampleAt[i] = now;
    }
  }

  if (now - lastReportAt < REPORT_INTERVAL_MS) return;
  lastReportAt = now;

  Serial.print("W");
  for (int i = 0; i < NUM_CELLS; i++) {
    if (sampleCount[i] > 0) {
      lastGrams[i] = sampleSum[i] / sampleCount[i];
      sampleSum[i] = 0;
      sampleCount[i] = 0;
    } else if (now - lastSampleAt[i] > STALE_AFTER_MS) {
      lastGrams[i] = NAN;
    }
    Serial.print(' ');
    if (isnan(lastGrams[i])) Serial.print("nan");
    else Serial.print(lastGrams[i], 3);
  }
  Serial.println();
}
