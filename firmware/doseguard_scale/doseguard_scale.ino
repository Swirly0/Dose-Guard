/*
  DoseGuard pillbox firmware (Arduino Mega + 7 HX711 load cells + 7 indicator LEDs).

  Wiring (compartment 1 = Sunday ... 7 = Saturday):
    Sunday    DT/DAT D22  SCK/CLK D23
    Monday    DT/DAT D24  SCK/CLK D25
    Tuesday   DT/DAT D26  SCK/CLK D27
    Wednesday DT/DAT D44  SCK/CLK D45
    Thursday  DT/DAT D46  SCK/CLK D47
    Friday    DT/DAT D48  SCK/CLK D49
    Saturday  DT/DAT D50  SCK/CLK D51
    LED 1–7 anodes -> D28–D34 (Sunday–Saturday; 220-330 ohm, cathode to GND)

  Serial protocol, 115200 baud, one message per line:

    Arduino -> laptop
      READY                         sent once after start-up tare
      W g1 g2 g3 g4 g5 g6 g7        grams per compartment, Sunday = 1 ... Saturday = 7,
                                    sent every REPORT_INTERVAL_MS; "nan" = no reading
      PONG                          reply to PING
      OK TARE                       tare finished
      OK LED                        LED command accepted
      ERR <message>

    Laptop -> Arduino
      PING
      TARE                          zero all compartments (empty bins in place)
      TARE <1-7>                    zero one compartment
      LED <1-7|ALL> <mode> [ms]     mode: ON, OFF, BLINK (slow), FAST (fast blink);
                                    optional ms turns the LED off after that long

  Each HX711 has its own DOUT/SCK pair. All boards convert in parallel; the loop reads
  whichever is ready and averages the samples collected since the last report.
*/

#include "HX711.h"

const int NUM_CELLS = 7;

// Index 0 = Sunday ... index 6 = Saturday. Keep in sync with calibrate_scale.ino.
const int DOUT_PINS[NUM_CELLS] = {22, 24, 26, 44, 46, 48, 50};
const int SCK_PINS[NUM_CELLS]  = {23, 25, 27, 45, 47, 49, 51};
const int LED_PINS[NUM_CELLS]  = {28, 29, 30, 31, 32, 33, 34};

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

const byte LED_OFF = 0, LED_ON = 1, LED_BLINK = 2, LED_FAST = 3;
byte ledMode[NUM_CELLS];
unsigned long ledStartedAt[NUM_CELLS];
unsigned long ledDurationMs[NUM_CELLS];  // 0 = stay in this mode until changed

char commandBuffer[32];
byte commandLength = 0;

void setLed(int i, byte mode, unsigned long durationMs) {
  ledMode[i] = mode;
  ledStartedAt[i] = millis();
  ledDurationMs[i] = durationMs;
}

void updateLeds(unsigned long now) {
  for (int i = 0; i < NUM_CELLS; i++) {
    if (ledDurationMs[i] > 0 && now - ledStartedAt[i] >= ledDurationMs[i]) {
      ledMode[i] = LED_OFF;
      ledDurationMs[i] = 0;
    }
    bool on = false;
    switch (ledMode[i]) {
      case LED_ON:    on = true; break;
      case LED_BLINK: on = (now / 500) % 2 == 0; break;
      case LED_FAST:  on = (now / 125) % 2 == 0; break;
      default:        on = false; break;
    }
    digitalWrite(LED_PINS[i], on ? HIGH : LOW);
  }
}

// Parses "<1-7|ALL> <ON|OFF|BLINK|FAST> [ms]".
void handleLedCommand(char *args) {
  char *target = strtok(args, " ");
  char *modeName = strtok(NULL, " ");
  char *duration = strtok(NULL, " ");
  if (!target || !modeName) {
    Serial.println("ERR usage: LED <1-7|ALL> <ON|OFF|BLINK|FAST> [ms]");
    return;
  }

  byte mode;
  if (strcmp(modeName, "ON") == 0) mode = LED_ON;
  else if (strcmp(modeName, "OFF") == 0) mode = LED_OFF;
  else if (strcmp(modeName, "BLINK") == 0) mode = LED_BLINK;
  else if (strcmp(modeName, "FAST") == 0) mode = LED_FAST;
  else {
    Serial.println("ERR LED mode must be ON, OFF, BLINK, or FAST");
    return;
  }
  unsigned long durationMs = duration ? strtoul(duration, NULL, 10) : 0;

  if (strcmp(target, "ALL") == 0) {
    for (int i = 0; i < NUM_CELLS; i++) setLed(i, mode, durationMs);
  } else {
    int day = atoi(target);
    if (day < 1 || day > NUM_CELLS) {
      Serial.println("ERR compartment must be 1-7 or ALL");
      return;
    }
    setLed(day - 1, mode, durationMs);
  }
  Serial.println("OK LED");
}

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
  } else if (strncmp(cmd, "LED ", 4) == 0) {
    handleLedCommand(cmd + 4);
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
    pinMode(LED_PINS[i], OUTPUT);
    setLed(i, LED_OFF, 0);
  }

  // Light each LED in turn so the wiring can be checked at a glance.
  for (int i = 0; i < NUM_CELLS; i++) {
    digitalWrite(LED_PINS[i], HIGH);
    delay(120);
    digitalWrite(LED_PINS[i], LOW);
  }

  delay(300);          // let the HX711s power up
  tareCells(0x7F);     // tare with the empty bins in place
  Serial.println("READY");
}

void loop() {
  readCommands();

  unsigned long now = millis();
  updateLeds(now);
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
