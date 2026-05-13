package org.example.moetazproject.Services;

import org.eclipse.paho.client.mqttv3.*;
import org.example.moetazproject.Entities.Mesure;
import org.example.moetazproject.Repositories.CiterneRepository;
import org.example.moetazproject.Repositories.MesureRepository;
import org.example.moetazproject.Repositories.DepotRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;

/**
 * SERVICE : MqttSubscriber
 * Ce service est le "Cerveau" qui écoute les capteurs ESP32.
 * Il tourne en arrière-plan dès le démarrage de l'application.
 */
@Service
public class MqttSubscriber {

    // @Autowired = Injection de dépendance. 
    // On demande à Spring d'aller chercher automatiquement les "outils" (Repositories) pour parler à MySQL.
    @Autowired
    private CiterneRepository citerneRepo;

    @Autowired
    private MesureRepository mesureRepo;

    @Autowired
    private DepotRepository depotRepo;

    @Autowired
    private EmailService emailService;

    // @Value va chercher les réglages dans le fichier 'application.properties'
    @Value("${mqtt.broker.url:tcp://mosquitto-broker:1883}")
    private String brokerUrl;

    @Value("${mqtt.topic:citerne/mesure}")
    private String topic;

    private MqttClient mqttClient;

    /**
     * @PostConstruct : Cette méthode s'exécute automatiquement une fois que le service est prêt.
     * C'est ici qu'on lance la connexion au Broker Mosquitto.
     */
    @PostConstruct
    public void startSubscribing() {
        try {
            // ID unique pour que le serveur nous reconnaisse (indispensable pour la persistance)
            String clientId = "STTGO_BACKEND_SERVICE";
            
            // On configure le client MQTT avec une persistance sur fichier pour plus de sécurité
            mqttClient = new MqttClient(brokerUrl, clientId, new org.eclipse.paho.client.mqttv3.persist.MqttDefaultFilePersistence());

            MqttConnectOptions options = new MqttConnectOptions();
            options.setAutomaticReconnect(true); // Se reconnecte tout seul si le réseau coupe
            options.setCleanSession(false);      // "false" = Le broker garde les messages pour nous si on est déconnecté
            options.setConnectionTimeout(10);
            options.setKeepAliveInterval(60);

            // Définition de ce qu'on fait quand un message arrive
            mqttClient.setCallback(new MqttCallback() {
                @Override
                public void connectionLost(Throwable cause) {
                    System.out.println("⚠️ Connexion MQTT perdue : " + cause.getMessage());
                }

                @Override
                public void messageArrived(String topic, MqttMessage message) throws Exception {
                    String payload = new String(message.getPayload());
                    System.out.println("📩 Message reçu sur [" + topic + "] : " + payload);

                    try {
                        // ObjectMapper : Transforme le texte JSON (ex: {"temp": 25}) en objet Java utilisable
                        ObjectMapper mapper = new ObjectMapper();
                        JsonNode json = mapper.readTree(payload);

                        // CAS 1 : C'est une mesure de niveau de CITERNE
                        if (json.has("citerne_id")) {
                            Long citerneId = json.get("citerne_id").asLong();
                            double distance = json.get("distance").asDouble();

                            // On cherche la citerne correspondante dans la base de données
                            citerneRepo.findById(citerneId).ifPresent(c -> {
                                // On crée une nouvelle "Mesure" pour l'historique
                                Mesure m = new Mesure();
                                m.setCiterne(c);
                                m.setNiveau(distance);
                                m.setDateMesure(LocalDateTime.now());

                                // Sauvegarde dans MySQL
                                Mesure savedMesure = mesureRepo.save(m);
                                System.out.println("💾 Mesure sauvegardée pour : " + c.getNom());

                                // --- LOGIQUE DE SÉCURITÉ (FEU DE SIGNALISATION) ---
                                try {
                                    String command = "YELLOW_ON"; // Par défaut : niveau normal
                                    
                                    if (savedMesure.getPourcentage() >= 80) {
                                        command = "GREEN_ON"; // Citerne bien remplie
                                        c.setAlerteNiveauCritique(false); 
                                    } 
                                    else if (savedMesure.getPourcentage() <= 20) {
                                        command = "RED_ON"; // Attention : niveau bas !
                                        // On envoie un email d'alerte seulement si ce n'est pas déjà fait
                                        if (!c.isAlerteNiveauCritique()) {
                                            emailService.sendCriticalAlert(c.getNom(), savedMesure.getPourcentage());
                                            c.setAlerteNiveauCritique(true);
                                        }
                                    } else {
                                        c.setAlerteNiveauCritique(false);
                                    }
                                    
                                    citerneRepo.save(c);

                                    // On renvoie l'ordre à l'ESP32 pour qu'il allume la bonne LED
                                    String statusTopic = "citerne/" + citerneId + "/status";
                                    MqttMessage responseMsg = new MqttMessage(command.getBytes());
                                    responseMsg.setQos(1); 
                                    mqttClient.publish(statusTopic, responseMsg);
                                } catch (MqttException e) {
                                    System.err.println("❌ Erreur envoi commande LED : " + e.getMessage());
                                }
                            });
                        } 
                        // CAS 2 : C'est une mesure d'environnement (TEMPÉRATURE / HUMIDITÉ)
                        else if (json.has("depot_id")) {
                            Long depotId = json.get("depot_id").asLong();
                            double temp = json.get("temp").asDouble();
                            double hum = json.get("hum").asDouble();

                            depotRepo.findById(depotId).ifPresent(d -> {
                                d.setTemperature(temp);
                                d.setHumidity(hum);
                                
                                // Alerte de température critique (45°C)
                                if (temp >= 45.0) {
                                    if (!d.isAlerteTemp()) {
                                        emailService.sendTemperatureAlert(d.getNom(), temp);
                                        d.setAlerteTemp(true);
                                    }
                                } else if (temp < 40.0) {
                                    d.setAlerteTemp(false); // Réinitialisation de l'alerte
                                }
                                
                                depotRepo.save(d); // Mise à jour du dépôt en base
                                System.out.println("🌡️ Environnement mis à jour pour : " + d.getNom());
                            });
                        }
                    } catch (Exception e) {
                        System.err.println("❌ Erreur traitement JSON : " + e.getMessage());
                    }
                }

                @Override
                public void deliveryComplete(IMqttDeliveryToken token) {}
            });

            // Connexion effective au broker
            mqttClient.connect(options);
            
            // On s'abonne aux topics avec QoS 1 (Garantie de réception)
            mqttClient.subscribe("citerne/#", 1);
            mqttClient.subscribe("depot/#", 1);
            
            System.out.println("\n========================================================");
            System.out.println("🟢 CONNEXION MOSQUITTO RÉUSSIE 🟢");
            System.out.println("✅ Le backend écoute les capteurs...");
            System.out.println("========================================================\n");
            
        } catch (MqttException e) {
            System.err.println("❌ Impossible de démarrer MQTT : " + e.getMessage());
        }
    }

    /**
     * S'exécute juste avant que l'application s'arrête.
     * On ferme proprement la connexion.
     */
    @jakarta.annotation.PreDestroy
    public void disconnect() {
        try {
            if (mqttClient != null && mqttClient.isConnected()) {
                mqttClient.disconnect();
                mqttClient.close();
            }
        } catch (MqttException e) {
            e.printStackTrace();
        }
    }
}
