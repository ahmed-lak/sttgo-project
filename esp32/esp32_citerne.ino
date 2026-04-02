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
const char* WIFI_PASSWORD = "0000000"; // ← Remplacez par votre mot de passe

// --- MQTT ---
const char* MQTT_BROKER   = "172.20.10.10";      // ← IP du PC qui exécute le broker Mosquitto
const int   MQTT_PORT     = 1883;
const char* MQTT_TOPIC    = "citerne/mesure";      // Doit correspondre au backend (application.properties)
const char* MQTT_CLIENT_ID = "ESP32_Citerne";

// --- Citerne ---
const long  CITERNE_ID = 1;  // ← L'ID de la citerne dans la base MySQL (seule config nécessaire)

// --- Capteur ultrason HC-SR04 ---
const int TRIG_PIN = 26;   // GPIO pour TRIG
const int ECHO_PIN = 25;  // GPIO pour ECHO

// --- Intervalle de mesure ---
const unsigned long INTERVALLE_MESURE_MS = 10000; // 10 secondes entre chaque envoi

// ======================== VARIABLES GLOBALES ========================

WiFiClient   espClient;
PubSubClient mqttClient(espClient);

unsigned long dernierEnvoi = 0;

// ======================== FONCTIONS ========================

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
 * Retourne la distance en cm entre le capteur (en haut) et la surface du liquide.
 * C'est la seule chose que l'ESP32 fait. Le backend fera le reste.
 */
float mesurerDistanceCM() {
  // Impulsion TRIG de 10 µs
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Lecture du temps d'écho en microsecondes
  long duree = pulseIn(ECHO_PIN, HIGH, 30000); // timeout 30ms (~5m max)

  if (duree == 0) {
    Serial.println("Capteur : pas de retour d'echo !");
    return -1; // Erreur de lecture
  }

  // Vitesse du son = 343 m/s = 0.0343 cm/µs → distance = durée * 0.0343 / 2
  float distance = duree * 0.0343 / 2.0;
  return distance;
}

/**
 * Publie la distance brute du capteur sur le topic MQTT au format JSON.
 *
 * Payload envoyé :
 *   { "citerne_id": 1, "distance": 4.32 }
 *
 * Le backend (MqttSubscriber.java) reçoit ce JSON,
 * récupère la citerne par ID depuis MySQL,
 * et calcule : niveau = hauteurMax - distance, puis pourcentage et volume.
 */
void publierMesure(float distanceCM) {
  // Construire le JSON
  StaticJsonDocument<128> doc;
  doc["citerne_id"] = CITERNE_ID;
  doc["distance"]   = round(distanceCM * 100.0) / 100.0; // Arrondi à 2 décimales

  char payload[128];
  serializeJson(doc, payload, sizeof(payload));

  // Publier sur le topic MQTT
  if (mqttClient.publish(MQTT_TOPIC, payload)) {
    Serial.print("MQTT publie : ");
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
  Serial.println("  ESP32 - Capteur Niveau Citerne");
  Serial.println("  Mode : Distance brute uniquement");
  Serial.println("  Le backend fait TOUS les calculs");
  Serial.println("========================================");
  Serial.print("Citerne ID : ");
  Serial.println(CITERNE_ID);
  Serial.println();

  // Configurer les pins du capteur ultrason
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Connecter le Wi-Fi
  connecterWiFi();

  // Configurer le client MQTT
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);

  // Première connexion MQTT
  connecterMQTT();
}

// ======================== LOOP ========================

void loop() {
  // Maintenir la connexion MQTT
  if (!mqttClient.connected()) {
    connecterMQTT();
  }
  mqttClient.loop();

  // Vérifier si c'est le moment d'envoyer une mesure
  unsigned long maintenant = millis();
  if (maintenant - dernierEnvoi >= INTERVALLE_MESURE_MS) {
    dernierEnvoi = maintenant;

    // 1) Mesurer la distance brute (capteur → surface du liquide)
    float distance = mesurerDistanceCM();

    if (distance >= 0) {
      Serial.println("------------------------------------");
      Serial.print("Distance capteur brute : ");
      Serial.print(distance);
      Serial.println(" cm");

      // 2) Publier uniquement l'ID et la distance brute via MQTT
      //    Le backend calcule tout le reste (niveau, %, volume)
      publierMesure(distance);
      Serial.println("------------------------------------");
    } else {
      Serial.println("Mesure ignoree (erreur capteur)");
    }
  }
}
