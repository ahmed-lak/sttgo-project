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

@Service
public class MqttSubscriber {

    @Autowired
    private CiterneRepository citerneRepo;

    @Autowired
    private MesureRepository mesureRepo;

    @Autowired
    private DepotRepository depotRepo;

    @Autowired
    private EmailService emailService;

    @Value("${mqtt.broker.url:tcp://mosquitto-broker:1883}")
    private String brokerUrl;

    @Value("${mqtt.topic:citerne/mesure}")
    private String topic;

    private MqttClient mqttClient;

    @PostConstruct
    public void startSubscribing() {
        try {
            String clientId = MqttClient.generateClientId();
            mqttClient = new MqttClient(brokerUrl, clientId);

            MqttConnectOptions options = new MqttConnectOptions();
            options.setAutomaticReconnect(true);
            options.setCleanSession(true);
            options.setConnectionTimeout(10);

            mqttClient.setCallback(new MqttCallback() {
                @Override
                public void connectionLost(Throwable cause) {
                    System.out.println("MQTT Connection lost: " + cause.getMessage());
                }

                @Override
                public void messageArrived(String topic, MqttMessage message) throws Exception {
                    String payload = new String(message.getPayload());
                    System.out.println("Received MQTT message on topic " + topic + ": " + payload);

                    try {
                        ObjectMapper mapper = new ObjectMapper();
                        JsonNode json = mapper.readTree(payload);

                        if (json.has("citerne_id")) {
                            Long citerneId = json.get("citerne_id").asLong();
                            double distance = json.get("distance").asDouble();

                            citerneRepo.findById(citerneId).ifPresent(c -> {
                                System.out.println("MQTT -> Distance brute reçue: " + distance + " cm pour citerne: " + citerneId);

                                Mesure m = new Mesure();
                                m.setCiterne(c);
                                m.setNiveau(distance);
                                m.setDateMesure(LocalDateTime.now());

                                Mesure savedMesure = mesureRepo.save(m);
                                System.out.println("Mesure enregistrée avec succès via MQTT.");

                                // --- LOGIQUE FEU DE SIGNALISATION ---
                                try {
                                    String command = "YELLOW_ON"; // Niveau moyen par défaut
                                    if (savedMesure.getPourcentage() >= 80) {
                                        command = "GREEN_ON";
                                        c.setAlerteNiveauCritique(false); // Reset alerte
                                    } else if (savedMesure.getPourcentage() <= 20) {
                                        command = "RED_ON";
                                        // Envoi de l'email seulement si l'alerte n'a pas encore été envoyée
                                        if (!c.isAlerteNiveauCritique()) {
                                            emailService.sendCriticalAlert(c.getNom(), savedMesure.getPourcentage());
                                            c.setAlerteNiveauCritique(true);
                                        }
                                    } else {
                                        c.setAlerteNiveauCritique(false); // Reset si on est entre les deux
                                    }
                                    citerneRepo.save(c); // Sauvegarde de l'état de l'alerte

                                    String statusTopic = "citerne/" + citerneId + "/status";
                                    mqttClient.publish(statusTopic, new MqttMessage(command.getBytes()));
                                    System.out.println("Traffic Light Command: " + command + " for " + statusTopic);
                                } catch (MqttException e) {
                                    System.err.println("Failed to send LED command: " + e.getMessage());
                                }
                            });
                        } else if (json.has("depot_id")) {
                            Long depotId = json.get("depot_id").asLong();
                            double temp = json.get("temp").asDouble();
                            double hum = json.get("hum").asDouble();

                            depotRepo.findById(depotId).ifPresent(d -> {
                                d.setTemperature(temp);
                                d.setHumidity(hum);
                                depotRepo.save(d);
                                System.out.println("Données environnementales enregistrées pour dépôt: " + depotId);
                            });
                        }
                    } catch (Exception e) {
                        System.err.println("Erreur lors du traitement du message MQTT: " + e.getMessage());
                    }
                }

                @Override
                public void deliveryComplete(IMqttDeliveryToken token) {
                    // Not needed for subscriber
                }
            });

            mqttClient.connect(options);
            mqttClient.subscribe("citerne/#");
            mqttClient.subscribe("depot/#");
            System.out.println("\n========================================================");
            System.out.println("🟢 CONNEXION MOSQUITTO PARFAITE 🟢");
            System.out.println("✅ Connecté au broker MQTT (" + brokerUrl + ")");
            System.out.println("✅ Abonné au topic : " + topic);
            System.out.println("========================================================\n");
        } catch (MqttException e) {
            System.err.println("Impossible de démarrer le client MQTT : " + e.getMessage());
        }
    }

    @jakarta.annotation.PreDestroy
    public void disconnect() {
        try {
            if (mqttClient != null && mqttClient.isConnected()) {
                mqttClient.disconnect();
                mqttClient.close();
                System.out.println("Déconnecté du broker MQTT");
            }
        } catch (MqttException e) {
            e.printStackTrace();
        }
    }
}
