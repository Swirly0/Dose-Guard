/*
  DoseGuard load-cell calibration and live gram display.

  Arduino Mega wiring:
    Sunday    DT/DAT D22  SCK/CLK D23
    Monday    DT/DAT D24  SCK/CLK D25
    Tuesday   DT/DAT D26  SCK/CLK D27
    Wednesday DT/DAT D44  SCK/CLK D45
    Thursday  DT/DAT D46  SCK/CLK D47
    Friday    DT/DAT D48  SCK/CLK D49
    Saturday  DT/DAT D50  SCK/CLK D51
    LED 1–7 anodes => D28–D34 (Sunday–Saturday; 220–330 ohm to each anode, cathode to GND)

  Compartment 1 = Sunday ... 7 = Saturday.

  Upload, open the Serial Monitor at 115200 with Newline (or Both NL & CR).

  Quick start:
    1. Leave every bin empty and send   TARE
    2. Send   CELL 1   (Sunday; LED 1 lights)
    3. Send   KNOWN 5  if your reference mass is not 5 g
    4. Send   CAL      and follow the prompts
    5. Repeat CELL / CAL for compartments 2–7
    6. Send   FACTORS  and paste the array into doseguard_scale.ino
    7. Drop pills in a bin — live weights print in grams
*/

// Approximate counts-per-gram so the live table is in grams before CAL.
// CAL replaces this per cell. Keep in sync with doseguard_scale.ino if you have
// already measured real factors.

#include <math.h>
#include "HX711.h"

const int NUM_CELLS = 7;
const char *const DAY_NAMES[NUM_CELLS] = {
  "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
};

const int DOUT_PINS[NUM_CELLS] = {22, 24, 26, 44, 46, 48, 50};
const int SCK_PINS[NUM_CELLS]  = {23, 25, 27, 45, 47, 49, 51};
const int LED_PINS[NUM_CELLS]  = {28, 29, 30, 31, 32, 33, 34};

const unsigned long REPORT_MS = 400;
const unsigned long READY_TIMEOUT_MS = 4000;
const int TARE_SAMPLES = 20;
const int CAL_SAMPLES = 20;
const float PILL_LED_G = 0.05f;  // light the LED when a compartment holds this much
const float DEFAULT_FACTOR = 645.89f;

HX711 scales[NUM_CELLS];
bool present[NUM_CELLS];
float factors[NUM_CELLS];
bool calibrated[NUM_CELLS];
float sampleSum[NUM_CELLS];
int sampleCount[NUM_CELLS];
float lastGrams[NUM_CELLS];

int selectedCell = 0;       // 0-based
float knownMassG = 5.0f;
bool liveOutput = true;
unsigned long lastReportAt = 0;
int headerCountdown = 0;

char cmdBuf[48];
byte cmdLen = 0;

void setLeds(int onlyOn) {
  for (int i = 0; i < NUM_CELLS; i++) {
    digitalWrite(LED_PINS[i], (onlyOn >= 0 && i == onlyOn) ? HIGH : LOW);
  }
}

void updateWeightLeds() {
  for (int i = 0; i < NUM_CELLS; i++) {
    bool on = present[i] && !isnan(lastGrams[i]) && fabsf(lastGrams[i]) >= PILL_LED_G;
    digitalWrite(LED_PINS[i], on ? HIGH : LOW);
  }
}

bool waitReady(int i, unsigned long timeoutMs) {
  unsigned long start = millis();
  while (!scales[i].is_ready()) {
    if (millis() - start >= timeoutMs) return false;
    delay(10);
  }
  return true;
}

void printHelp() {
  Serial.println(F("Commands:"));
  Serial.println(F("  HELP                 this list"));
  Serial.println(F("  LIVE                 stream all 7 weights in grams"));
  Serial.println(F("  TARE [1-7|ALL]       zero empty bins (default ALL)"));
  Serial.println(F("  CELL <1-7>           select a compartment (lights its LED)"));
  Serial.println(F("  KNOWN <grams>        reference mass used by CAL (default 5)"));
  Serial.println(F("  CAL [1-7]            calibrate the selected (or given) cell"));
  Serial.println(F("  FACTOR <1-7> <n>     set a known counts-per-gram value"));
  Serial.println(F("  FACTORS              print CALIBRATION_FACTORS[] to paste"));
}

void printFactors() {
  Serial.println(F("Paste into doseguard_scale.ino:"));
  Serial.println(F("const float CALIBRATION_FACTORS[NUM_CELLS] = {"));
  for (int i = 0; i < NUM_CELLS; i++) {
    Serial.print(F("  "));
    Serial.print(factors[i], 2);
    Serial.print(i < NUM_CELLS - 1 ? F(",") : F(""));
    Serial.print(F("  // "));
    Serial.print(i + 1);
    Serial.print(F(" "));
    Serial.print(DAY_NAMES[i]);
    Serial.println(calibrated[i] ? F("") : F("  (not calibrated this session)"));
  }
  Serial.println(F("};"));
}

void printHeader() {
  Serial.print(F("#"));
  for (int i = 0; i < NUM_CELLS; i++) {
    Serial.print('\t');
    Serial.print(i + 1);
    Serial.print(' ');
    Serial.print(DAY_NAMES[i]);
  }
  Serial.println(F("\t(g)"));
  headerCountdown = 20;
}

void printLiveLine() {
  if (headerCountdown <= 0) printHeader();
  headerCountdown--;

  Serial.print(' ');
  for (int i = 0; i < NUM_CELLS; i++) {
    Serial.print('\t');
    if (!present[i] || isnan(lastGrams[i])) {
      Serial.print(F("--- g"));
    } else {
      Serial.print(lastGrams[i], 3);
      Serial.print(F(" g"));
    }
  }
  Serial.println();
}

void tareCell(int i) {
  if (!present[i]) {
    Serial.print(F("ERR HX711 "));
    Serial.print(i + 1);
    Serial.println(F(" is not responding"));
    return;
  }
  if (!waitReady(i, READY_TIMEOUT_MS)) {
    Serial.print(F("ERR HX711 "));
    Serial.print(i + 1);
    Serial.println(F(" timed out during tare"));
    return;
  }
  scales[i].tare(TARE_SAMPLES);
  sampleSum[i] = 0;
  sampleCount[i] = 0;
  lastGrams[i] = 0;
}

void tareMask(byte mask) {
  for (int i = 0; i < NUM_CELLS; i++) {
    if (mask & (1 << i)) tareCell(i);
  }
  Serial.println(F("OK TARE"));
}

void applyFactor(int i, float factor) {
  factors[i] = factor;
  scales[i].set_scale(factor);
  sampleSum[i] = 0;
  sampleCount[i] = 0;
}

void calibrateCell(int i) {
  liveOutput = false;
  setLeds(i);

  Serial.print(F("Calibrating compartment "));
  Serial.print(i + 1);
  Serial.print(F(" ("));
  Serial.print(DAY_NAMES[i]);
  Serial.println(F("). Keep the empty bin on the cell."));

  if (!present[i] || !waitReady(i, READY_TIMEOUT_MS)) {
    Serial.print(F("ERR HX711 "));
    Serial.print(i + 1);
    Serial.println(F(" is not responding"));
    liveOutput = true;
    return;
  }

  delay(2500);
  scales[i].set_scale(1.0f);
  scales[i].tare(TARE_SAMPLES);

  Serial.print(F("Tared. Place "));
  Serial.print(knownMassG, 3);
  Serial.println(F(" g on the cell now."));
  delay(5000);

  float raw = scales[i].get_value(CAL_SAMPLES);
  if (fabsf(raw) < 1.0f) {
    Serial.println(F("ERR reading is near 0 g — is the reference on the cell?"));
    applyFactor(i, factors[i]);
    liveOutput = true;
    return;
  }

  float factor = raw / knownMassG;
  applyFactor(i, factor);
  calibrated[i] = true;

  Serial.print(F("Reading: "));
  Serial.print(scales[i].get_units(CAL_SAMPLES), 3);
  Serial.println(F(" g"));
  Serial.print(F("Calibration factor: "));
  Serial.println(factor, 2);
  Serial.println(F("Live grams resume. Remove the reference and weigh pills."));
  liveOutput = true;
  headerCountdown = 0;
}

int parseCell(const char *text) {
  int day = atoi(text);
  if (day < 1 || day > NUM_CELLS) return -1;
  return day - 1;
}

void handleCommand(char *cmd) {
  if (cmd[0] == '\0') return;

  if (strcmp(cmd, "HELP") == 0 || strcmp(cmd, "?") == 0) {
    printHelp();
  } else if (strcmp(cmd, "LIVE") == 0) {
    liveOutput = true;
    headerCountdown = 0;
    Serial.println(F("Live grams on."));
  } else if (strcmp(cmd, "TARE") == 0 || strcmp(cmd, "TARE ALL") == 0) {
    tareMask(0x7F);
  } else if (strncmp(cmd, "TARE ", 5) == 0) {
    int i = parseCell(cmd + 5);
    if (i < 0) {
      Serial.println(F("ERR compartment must be 1-7 or ALL"));
      return;
    }
    tareMask(1 << i);
  } else if (strncmp(cmd, "CELL ", 5) == 0) {
    int i = parseCell(cmd + 5);
    if (i < 0) {
      Serial.println(F("ERR compartment must be 1-7"));
      return;
    }
    selectedCell = i;
    setLeds(i);
    Serial.print(F("Selected compartment "));
    Serial.print(i + 1);
    Serial.print(F(" ("));
    Serial.print(DAY_NAMES[i]);
    Serial.println(F(")"));
  } else if (strcmp(cmd, "CELL") == 0) {
    Serial.print(F("Selected compartment "));
    Serial.print(selectedCell + 1);
    Serial.print(F(" ("));
    Serial.print(DAY_NAMES[selectedCell]);
    Serial.println(F(")"));
  } else if (strncmp(cmd, "KNOWN ", 6) == 0) {
    float grams = atof(cmd + 6);
    if (grams <= 0.0f) {
      Serial.println(F("ERR reference mass must be > 0"));
      return;
    }
    knownMassG = grams;
    Serial.print(F("Reference mass: "));
    Serial.print(knownMassG, 3);
    Serial.println(F(" g"));
  } else if (strcmp(cmd, "KNOWN") == 0) {
    Serial.print(F("Reference mass: "));
    Serial.print(knownMassG, 3);
    Serial.println(F(" g"));
  } else if (strcmp(cmd, "CAL") == 0) {
    calibrateCell(selectedCell);
  } else if (strncmp(cmd, "CAL ", 4) == 0) {
    int i = parseCell(cmd + 4);
    if (i < 0) {
      Serial.println(F("ERR compartment must be 1-7"));
      return;
    }
    selectedCell = i;
    calibrateCell(i);
  } else if (strcmp(cmd, "FACTORS") == 0) {
    printFactors();
  } else if (strncmp(cmd, "FACTOR ", 7) == 0) {
    char *rest = cmd + 7;
    int i = parseCell(rest);
    if (i < 0) {
      Serial.println(F("ERR usage: FACTOR <1-7> <counts-per-gram>"));
      return;
    }
    while (*rest && *rest != ' ') rest++;
    while (*rest == ' ') rest++;
    float factor = atof(rest);
    if (factor == 0.0f) {
      Serial.println(F("ERR usage: FACTOR <1-7> <counts-per-gram>"));
      return;
    }
    applyFactor(i, factor);
    calibrated[i] = true;
    Serial.print(F("Compartment "));
    Serial.print(i + 1);
    Serial.print(F(" factor: "));
    Serial.println(factor, 2);
  } else {
    Serial.print(F("ERR unknown command: "));
    Serial.println(cmd);
    Serial.println(F("Type HELP for the list."));
  }
}

void readCommands() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      cmdBuf[cmdLen] = '\0';
      for (byte i = 0; i < cmdLen; i++) cmdBuf[i] = toupper(cmdBuf[i]);
      handleCommand(cmdBuf);
      cmdLen = 0;
    } else if (cmdLen < sizeof(cmdBuf) - 1) {
      cmdBuf[cmdLen++] = c;
    }
  }
}

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < NUM_CELLS; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], LOW);
    scales[i].begin(DOUT_PINS[i], SCK_PINS[i]);
    factors[i] = DEFAULT_FACTOR;
    calibrated[i] = false;
    lastGrams[i] = NAN;
    sampleSum[i] = 0;
    sampleCount[i] = 0;
  }

  // Walk the LEDs so wiring can be checked at a glance.
  for (int i = 0; i < NUM_CELLS; i++) {
    digitalWrite(LED_PINS[i], HIGH);
    delay(120);
    digitalWrite(LED_PINS[i], LOW);
  }

  delay(400);
  Serial.println();
  Serial.println(F("DoseGuard scale calibration — all weights in grams."));
  Serial.println(F("Probing HX711s..."));

  for (int i = 0; i < NUM_CELLS; i++) {
    present[i] = waitReady(i, 1500);
    Serial.print(F("  "));
    Serial.print(i + 1);
    Serial.print(F(" "));
    Serial.print(DAY_NAMES[i]);
    Serial.print(F("  DT D"));
    Serial.print(DOUT_PINS[i]);
    Serial.print(F("  SCK D"));
    Serial.print(SCK_PINS[i]);
    Serial.print(F("  LED D"));
    Serial.print(LED_PINS[i]);
    Serial.println(present[i] ? F("  ready") : F("  --- not found"));
    if (present[i]) scales[i].set_scale(factors[i]);
  }

  Serial.println();
  Serial.println(F("Taring empty bins..."));
  tareMask(0x7F);

  Serial.println();
  printHelp();
  Serial.println();
  Serial.println(F("Live weights are in grams. Send TARE again if a bin was not empty."));
  Serial.print(F("Reference mass is "));
  Serial.print(knownMassG, 3);
  Serial.println(F(" g (change with KNOWN)."));
}

void loop() {
  readCommands();
  if (!liveOutput) return;

  unsigned long now = millis();
  for (int i = 0; i < NUM_CELLS; i++) {
    if (!present[i]) continue;
    if (scales[i].is_ready()) {
      sampleSum[i] += scales[i].get_units(1);
      sampleCount[i]++;
    }
  }

  if (now - lastReportAt < REPORT_MS) return;
  lastReportAt = now;

  for (int i = 0; i < NUM_CELLS; i++) {
    if (sampleCount[i] > 0) {
      lastGrams[i] = sampleSum[i] / sampleCount[i];
      sampleSum[i] = 0;
      sampleCount[i] = 0;
    } else if (!present[i]) {
      lastGrams[i] = NAN;
    }
  }

  updateWeightLeds();
  printLiveLine();
}
