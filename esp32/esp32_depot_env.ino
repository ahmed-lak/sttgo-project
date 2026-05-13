/*
 * ============================================================
 *  ESP32 - Environment Monitoring (DHT22)
 * ============================================================
 *  This card is assigned to a DEPOT and sends Temperature/Humidity.
 *  It is independent of the tank level cards.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "DHT.h"

// ======================== CONFIGURATION ========================

// --- Wi-Fi ---
const char* WIFI_SSID     = "iPhone";
const char* WIFI_PASSWORD = "0000000";

// --- MQTT ---
const char* MQTT_BROKER   = "172.20.10.10";
const int   MQTT_PORT     = 1883;
const char* MQTT_TOPIC    = "citerne/mesure"; 
const char* MQTT_CLIENT_ID = "ESP32_Depot_Env_1"; // Unique ID per card

// --- Depot ---
const int   DEPOT_ID      = 1; // ID of the depot in the database

// --- DHT22 ---
#define DHTPIN 13
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// --- Interval ---
const unsigned long INTERVALLE_MS = 30000; // 30 seconds

// ======================== GLOBALS ========================

WiFiClient espClient;
PubSubClient mqttClient(espClient);
unsigned long dernierEnvoi = 0;

void connecterWiFi() {
  Serial.print("Connecting to ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

void connecterMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");
    if (mqttClient.connect(MQTT_CLIENT_ID)) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  connecterWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
}

void loop() {
  if (!mqttClient.connected()) connecterMQTT();
  mqttClient.loop();

  unsigned long maintenant = millis();
  if (maintenant - dernierEnvoi >= INTERVALLE_MS) {
    dernierEnvoi = maintenant;

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (isnan(h) || isnan(t)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }

    StaticJsonDocument<128> doc;
    doc["depot_id"] = DEPOT_ID;
    doc["temp"]     = round(t * 10.0) / 10.0;
    doc["hum"]      = round(h * 10.0) / 10.0;

    char payload[128];
    serializeJson(doc, payload, sizeof(payload));

    // Utilisation de 'retained = true' pour la persistance des données environnementales
    if (mqttClient.publish(MQTT_TOPIC, payload, true)) {
      Serial.print("Published (retained): ");
      Serial.println(payload);
    }
  }
}
