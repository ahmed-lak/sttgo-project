package org.example.moetazproject.Services;

import org.eclipse.paho.client.mqttv3.*;
import org.example.moetazproject.Entities.Mesure;
import org.example.moetazproject.Repositories.CiterneRepository;
import org.example.moetazproject.Repositories.MesureRepository;
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

    @Value("${mqtt.broker.url:tcp://172.20.10.10:1883}")
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

                        Long citerneId = json.get("citerne_id").asLong();
                        double distance = json.get("distance").asDouble();

                        citerneRepo.findById(citerneId).ifPresent(c -> {
                            // Récupérer la hauteur max depuis les paramètres de la citerne en BDD
                            // Pour une citerne couchée (horizontale), le capteur est monté sur le rayon,
                            // donc la hauteur max = diamètre
                            double hauteurMax = "VERTICAL".equalsIgnoreCase(c.getType())
                                    ? c.getHauteurTotale()
                                    : c.getDiametre();

                            // Calcul du niveau réel du liquide :
                            // niveau réel = hauteur totale du capteur - distance mesurée
                            double niveauReel = hauteurMax - distance;

                            if (niveauReel < 0)
                                niveauReel = 0;
                            if (niveauReel > hauteurMax)
                                niveauReel = hauteurMax;

                            System.out.println("MQTT -> distance brute: " + distance
                                    + " cm | hauteurMax: " + hauteurMax
                                    + " cm | niveau réel calculé: " + niveauReel + " cm");

                            Mesure m = new Mesure();
                            // Important : setCiterne D'ABORD
                            m.setCiterne(c);
                            // On passe le niveau réel calculé (hauteur du liquide en cm)
                            m.setNiveau(niveauReel);
                            m.setDateMesure(LocalDateTime.now());

                            mesureRepo.save(m);
                            System.out.println("Mesure enregistree depuis MQTT.");
                        });
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
            mqttClient.subscribe(topic);
            System.out.println("Connecté au broker MQTT (" + brokerUrl + ") et abonné au topic: " + topic);

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
