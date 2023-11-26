#include "max6675.h"
#include <Preferences.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include "SPIFFS.h"
#include "FS.h"
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <Arduino_JSON.h>
#include "DataHelper.h"

const char* ssid = "Your Network SSID Here";
const char* password = "Your Network Password Here";

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

JSONVar readings;
JSONVar configs;

// Timer variables
unsigned long lastTime = 0;
unsigned long timerDelay = 5000;

// thermo_0 setup
int thermoDO_0 = 19; // SO
int thermoCS_0 = 18; // CS
int thermoCLK_0 = 5; // SCK

// thermo_1 setu
int thermoDO_1 = 4; // SO
int thermoCS_1 = 2; // CS
int thermoCLK_1 = 15; // SCK

float thermoFahrenheit_0, thermoFahrenheit_1;

// pwm setup
const int pwmPin = 26; // PWM control pin
const int tachPin = 27; // RPM feedback pin

const int freq = 25000; // 25 kHz PWM frequency
const int ledChannel = 0; // Use LED channel 0
const int resolution = 8; // 8-bit resolution

// mosfet gate to toggle fan ground
const int MOSFET_GATE = 14;

MAX6675 thermocouple_0(thermoCLK_0, thermoCS_0, thermoDO_0);
MAX6675 thermocouple_1(thermoCLK_1, thermoCS_1, thermoDO_1);

Preferences preferences;

const int thermAdjDef_0 = -153;
const int thermAdjDef_1 = -145;

const char* thermoKey_0 = "thermoKey_0";
const char* thermoKey_1 = "thermoKey_1";

const char* temperature_0 = "temperature_0";
const char* temperature_1 = "temperature_1";

const char* thermo_0_adjustment = "thermo_0_adjustment";
const char* thermo_1_adjustment = "thermo_1_adjustment";

const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 0;
const int   daylightOffset_sec = 3600;

void setup() {
  Serial.begin(9600);
  
  delay(3000);
  preferences.begin("thermo", false);

  Serial.println("Stored Preferences:");

  int storedValue_0 = preferences.getInt(thermoKey_0, thermAdjDef_0); // Provide a default value if not found
  int storedValue_1 = preferences.getInt(thermoKey_1, thermAdjDef_1); // Provide a default value if not found

  //Serial.print(thermoKey_0 + ": ");
  //Serial.println(storedValue_0);

  //Serial.print(thermoKey_1 + ": ");
  //Serial.println(storedValue_1);

  configs[thermoKey_0] = storedValue_0; 
  configs[thermoKey_1] = storedValue_1; 

  // Setup LEDC for PWM on pwmPin
  ledcSetup(ledChannel, freq, resolution);
  ledcAttachPin(pwmPin, ledChannel);
  pinMode(tachPin, INPUT_PULLUP); // Configure tachPin as input with internal pull-up resistor
  pinMode(MOSFET_GATE, OUTPUT);
  digitalWrite(MOSFET_GATE, LOW); // Turn Fan Off
  initSPIFFS();

  if (!LittleFS.begin()) {
    Serial.println("An error has occurred while mounting LittleFS");
    return;
  }

  initWiFi();

  delay(3000);

  initTime();

  delay(3000);

  checkAndUpdateJsonFile("/log.json");

  initWebSocket();

  // Web Server Root URL
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(SPIFFS, "/index.html", "text/html");
  });

  server.serveStatic("/", SPIFFS, "/");
  server.begin();
}

void initTime(){
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  // Wait for time to be set
  time_t now = time(nullptr);
  while (now < 24 * 3600) {
    delay(100);
    now = time(nullptr);
  }
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
}

void initSPIFFS() {
  if (!SPIFFS.begin(true)) {
    //Serial.println("An error has occurred while mounting SPIFFS");
  }
  //Serial.println("SPIFFS mounted successfully");
}

void initWiFi() {

  // Optionnal: Set your Static IP address
  IPAddress local_IP(192, 168, 86, 184);

  // Optionnal: Set your Gateway IP address
  IPAddress gateway(192, 168, 86, 1);
  IPAddress subnet(255, 255, 255, 0);

  if(!WiFi.config(local_IP, gateway, subnet)) {
    Serial.println("STA Failed to configure");
  }

  WiFi.mode(WIFI_STA);
  WiFi.setHostname("bootleg_bbq_blower");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi..");
  }
  Serial.println(WiFi.localIP());
}

void initWebSocket() {
  ws.onEvent(onEvent);
  server.addHandler(&ws);
}

String getSensorReadings(){

  int thermo0 = configs[thermoKey_0];
  int thermo1 = configs[thermoKey_1];

  thermoFahrenheit_0 = thermocouple_0.readFahrenheit() + thermo0;
  thermoFahrenheit_1 = thermocouple_1.readFahrenheit() + thermo1;

  readings[temperature_0] = thermoFahrenheit_0;
  readings[temperature_1] = thermoFahrenheit_1;

  addLogEntry("/log.json", "2023-11-17T13:28:06.419Z", 80.0, 80.0, 0);

  String jsonString = JSON.stringify(readings);
  
  return jsonString;
}

void notifyClients(String sensorReadings) {
  ws.textAll(sensorReadings);
}

void SendClientsConfiguration(){
  String jsonString = JSON.stringify(configs);
  notifyClients(jsonString);
}

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    String message = String((char*)data);
    JSONVar jsonData = JSON.parse(message);

    if (jsonData.hasOwnProperty("event")) {
      String event = (const char*)jsonData["event"];
      Serial.print("event: ");
      Serial.println(event);

      if (event == "setFanSpeed" && jsonData.hasOwnProperty("speed")) {
        int newFanSpeed = (int)jsonData["speed"];
        Serial.print("Received setFanSpeed event. New fan speed: ");
        Serial.println(newFanSpeed);

        if(newFanSpeed == 0){
          // turn off fan
          digitalWrite(MOSFET_GATE, LOW); 
        }
        else{
          // turn on fan
          digitalWrite(MOSFET_GATE, HIGH); 
          setFanSpeed(newFanSpeed);
        }

        readings["fan_speed"] = newFanSpeed;
        String jsonString = JSON.stringify(readings);
        notifyClients(jsonString);
      }
      else if(event == "updateConfiguration"){ 

        String jsonString = JSON.stringify(jsonData["configuration"]);
        Serial.println(jsonString); // {thermoKey_0:"-140",thermoKey_1:"-150"}

        DynamicJsonDocument doc(256);
    
        // Deserialize the JSON string into the JsonDocument
        DeserializationError error = deserializeJson(doc, jsonString);
  
        if (error) {
            Serial.print("Parsing Failed! ");
            Serial.println(error.c_str());
            return;
        }
    
        int tk0 = doc[thermo_0_adjustment];
        int tk1 = doc[thermo_1_adjustment];

        Serial.println("Event Adjustment Values: ");
        Serial.println(tk0);
        Serial.println(tk1);

        preferences.putInt(thermoKey_0, tk0);
        preferences.putInt(thermoKey_1, tk1);

        configs[thermoKey_0] = tk0; 
        configs[thermoKey_1] = tk1; 
      }
    }
  }
}

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
      SendClientsConfiguration();
      break;
    case WS_EVT_DISCONNECT:
      Serial.printf("WebSocket client #%u disconnected\n", client->id());
      break;
    case WS_EVT_DATA:
      handleWebSocketMessage(arg, data, len);
      break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
  }
}

void stopFan() {
    pinMode(pwmPin, OUTPUT);
    digitalWrite(pwmPin, LOW);
    delay(timerDelay);
    readPulse();     
    ledcAttachPin(pwmPin, ledChannel); // Reconfigure for PWM after reading pulse
}

void readPulse() {
  unsigned long pulseDuration = pulseIn(tachPin, LOW, 1000000);
  double frequency = 1000000.0 / pulseDuration;
  //Serial.print("pulse duration:");
  //Serial.println(pulseDuration);
  //Serial.print("time for a full rev. (microsec.):");
  //Serial.println(pulseDuration * 2);
  //Serial.print("freq. (Hz):");
  //Serial.println(frequency / 2);
  //Serial.print("RPM:");
  //Serial.println(frequency / 2 * 60);
  // Read RPM feedback from the fan (optional)
  int fanRPM = digitalRead(tachPin); // Assuming fan's TACH signal is connected to tachPin
  //Serial.print("Fan RPM feedback: ");
  //Serial.println(fanRPM);
}

void setFanSpeed(int percentage) {
  //Serial.print(percentage);  
  //Serial.println("%");
  int duty = (percentage * 255) / 100;
  ledcWrite(ledChannel, duty); 
  readPulse();
}

void loop() { 

  if ((millis() - lastTime) > timerDelay) {
    String sensorReadings = getSensorReadings();
    notifyClients(sensorReadings);   
    lastTime = millis();
  }

  ws.cleanupClients();
}
