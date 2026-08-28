#include <Arduino.h>

const int rfPins[4] = {18, 19, 21, 22};
const char* rfNames[4] = {"A", "B", "C", "D"};

bool previousState[4] = {LOW, LOW, LOW, LOW};

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < 4; i++) {
    pinMode(rfPins[i], INPUT_PULLDOWN);
  }

  Serial.println("RX480E 4-channel test ready");
}

void loop() {
  for (int i = 0; i < 4; i++) {
    bool currentState = digitalRead(rfPins[i]);

    if (currentState == HIGH && previousState[i] == LOW) {
      Serial.print(rfNames[i]);
      Serial.println(" PRESSED");
    }

    if (currentState == LOW && previousState[i] == HIGH) {
      Serial.print(rfNames[i]);
      Serial.println(" RELEASED");
    }

    previousState[i] = currentState;
  }

  delay(5);
}