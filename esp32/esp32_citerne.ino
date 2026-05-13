/*
 * ============================================================
 *  ESP32 - Capteur de niveau de citerne (HC-SR04 / JSN-SR04T)
 * ============================================================
 *  
 *  L'ESP32 est 100% automatique et ne fait AUCUN calcul.
 *  
 *  Il publie UNIQUEMENT :
 *    { "citerne_id": <ID>, "distance": <distance brute en cm> }
 *
 *  Le backend Spring Boot reçoit cette distance brute,
 *  récupère les paramètres de la citerne (hauteur, diamètre, 
 *  capacité max) depuis MySQL, et calcule automatiquement :
 *    - Le niveau réel du liquide (hauteurMax - distance)
 *    - Le pourcentage de remplissage
 *    - Le volume en litres
 *
 *  => L'ESP32 n'a besoin de connaître AUCUN paramètre de la citerne.
 *  => Si l'utilisateur modifie les dimensions dans le dashboard Angular,
 *     tout se recalcule automatiquement côté backend.
 *
 *  Bibliothèques requises (installer via le Library Manager) :
 *    - PubSubClient  (par Nick O'Leary)
 *    - ArduinoJson   (par Benoit Blanchon)
 *    - WiFi           (intégrée avec le board ESP32)
 *
 *  Board Arduino IDE :
 *    ESP32 Dev Module
 * ============================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ======================== CONFIGURATION ========================

// --- Wi-Fi ---
const char* WIFI_SSID     = "iPhone";        // ← Remplacez par votre SSID Wi-Fi
const char* WIFI_PASSWORD = "12344444"; // ← Remplacez par votre mot de passe

// --- MQTT ---
const char* MQTT_BROKER   = "172.20.10.2";      // ← IP du PC qui exécute le broker Mosquitto
const int   MQTT_PORT     = 1883;
const char* MQTT_TOPIC    = "citerne/mesure";      // Doit correspondre au backend (application.properties)
const char* MQTT_CLIENT_ID = "ESP32_Citerne";

// --- Citerne ---
const long  CITERNE_ID = 1;  // ← L'ID de la citerne dans la base MySQL (seule config nécessaire)

// --- Capteur ultrason HC-SR04 ---
const int TRIG_PIN = 26;
const int ECHO_PIN = 25;

// --- LEDs ---
const int RED_LED_PIN    = 27;
const int YELLOW_LED_PIN = 12; // Nouveau : Pin Jaune pour le module feu
const int GREEN_LED_PIN  = 14;

// --- Intervalle de mesure ---
const unsigned long INTERVALLE_MESURE_MS = 10000;

// ======================== VARIABLES GLOBALES ========================

WiFiClient   espClient;
PubSubClient mqttClient(espClient);

unsigned long dernierEnvoi = 0;

// ======================== FONCTIONS ========================

/**
 * Callback MQTT pour recevoir les commandes (LEDs)
 */
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("Message recu [");
  Serial.print(topic);
  Serial.print("] : ");
  Serial.println(message);

  // Éteindre toutes les LEDs avant d'allumer la bonne
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(YELLOW_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);

  if (message == "GREEN_ON") {
    digitalWrite(GREEN_LED_PIN, HIGH);
  } else if (message == "YELLOW_ON") {
    digitalWrite(YELLOW_LED_PIN, HIGH);
  } else if (message == "RED_ON") {
    digitalWrite(RED_LED_PIN, HIGH);
  } else if (message == "ALL_OFF") {
    // Déjà fait au dessus
  }
}

/**
 * Connexion au réseau Wi-Fi
 */
void connecterWiFi() {
  Serial.print("Connexion Wi-Fi a ");
  Serial.print(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tentatives = 0;
  while (WiFi.status() != WL_CONNECTED && tentatives < 30) {
    delay(500);
    Serial.print(".");
    tentatives++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi connecte !");
    Serial.print("Adresse IP : ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nEchec de connexion Wi-Fi. Redemarrage...");
    delay(3000);
    ESP.restart();
  }
}

/**
 * Connexion / reconnexion au broker MQTT
 */
void connecterMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connexion au broker MQTT (");
    Serial.print(MQTT_BROKER);
    Serial.print(")...");

    if (mqttClient.connect(MQTT_CLIENT_ID)) {
      Serial.println(" Connecte !");
      
      // S'abonner au topic de statut de CETTE citerne
      String statusTopic = "citerne/" + String(CITERNE_ID) + "/status";
      mqttClient.subscribe(statusTopic.c_str(), 1); // QoS 1
      Serial.print("Abonne avec QoS 1 a : ");
      Serial.println(statusTopic);
    } else {
      Serial.print(" Echec, code erreur = ");
      Serial.print(mqttClient.state());
      Serial.println(" - Nouvelle tentative dans 5s...");
      delay(5000);
    }
  }
}

/**
 * Mesure la distance brute avec le capteur HC-SR04.
 */
float mesurerDistanceCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duree = pulseIn(ECHO_PIN, HIGH, 30000); 

  if (duree == 0) {
    Serial.println("Capteur : pas de retour d'echo !");
    return -1; 
  }

  float distance = duree * 0.0343 / 2.0;
  return distance;
}

/**
 * Publie la distance brute du capteur sur le topic MQTT.
 */
void publierMesure(float distanceCM) {
  StaticJsonDocument<128> doc;
  doc["citerne_id"] = CITERNE_ID;
  doc["distance"]   = round(distanceCM * 100.0) / 100.0;

  char payload[128];
  serializeJson(doc, payload, sizeof(payload));

  // Publier avec 'retained = true' pour que le dernier niveau soit toujours disponible
  if (mqttClient.publish(MQTT_TOPIC, payload, true)) {
    Serial.print("MQTT publie (retained) : ");
    Serial.println(payload);
  } else {
    Serial.println("Echec de publication MQTT");
  }
}

// ======================== SETUP ========================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("========================================");
  Serial.println("  ESP32 - Capteur Niveau Citerne + LEDs");
  Serial.println("========================================");

  // Configurer les pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(YELLOW_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  
  // Éteindre au démarrage
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(YELLOW_LED_PIN, LOW);
  digitalWrite(GREEN_LED_PIN, LOW);

  connecterWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  connecterMQTT();
}

// ======================== LOOP ========================

void loop() {
  if (!mqttClient.connected()) {
    connecterMQTT();
  }
  mqttClient.loop();

  unsigned long maintenant = millis();
  if (maintenant - dernierEnvoi >= INTERVALLE_MESURE_MS) {
    dernierEnvoi = maintenant;

    float distance = mesurerDistanceCM();

    if (distance >= 0) {
      publierMesure(distance);
    }
  }
}
