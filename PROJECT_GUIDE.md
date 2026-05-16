# 🚀 STTGO IoT - Guide Complet du Projet

Ce document sert de référence technique pour comprendre l'architecture, le flux de données et la configuration du système de surveillance de citernes STTGO.

---

## 🏗️ 1. Architecture du Système

L'application utilise une architecture **Full-Stack IoT conteneurisée**.

### A. Matériel (Edge)
- **ESP32 Dev Module** : Capte la distance via un capteur ultrason (HC-SR04/JSN-SR04T).
- **Protocole** : MQTT (Léger, idéal pour l'IoT).
- **Payload JSON** : `{"citerne_id": 1, "distance": 45.2}`.

### B. Broker (Message Bus)
- **Eclipse Mosquitto** : Reçoit les messages des capteurs et les transmet au backend.
- **Port** : 1883.

### C. Backend (Logiciel & Calcul)
- **Framework** : Spring Boot 3.
- **Rôle** : Pivot entre le monde industriel (MQTT) et le monde web (REST).
- **Logique de calcul** : Convertit la distance brute en volume (Litres) et pourcentage en fonction des dimensions de la citerne stockées en base.
- **Consommation** : Calculée par cumul des baisses de volume (ignore les remplissages).

### D. Frontend (Interface Utilisateur)
- **Framework** : Angular 18.
- **Fonctionnalités** : Dashboard temps réel, Graphiques d'historique (Chart.js), Gestion des alertes de niveau critique (<= 20%).

---

## 🔒 2. Sécurité & Sessions

Nous avons implémenté une sécurité de niveau industriel :
- **Authentification** : Basic Auth encodée en Base64.
- **Sessions** : Utilisation exclusive de `sessionStorage`. 
  - Les données de connexion sont détruites à la fermeture de l'onglet.
  - La session est forcée à se vider si l'utilisateur revient à la page de login via l'historique du navigateur.
- **AuthGuard** : Un garde de sécurité empêche l'accès aux URLs du dashboard sans session valide.

---

## 📡 3. Flux de Données (Data Flow)

1. **Capture** : ESP32 -> Envoi MQTT (Topic: `citerne/mesure`).
2. **Ingestion** : Backend `MqttSubscriber` -> Réception -> Calcul de Volume.
3. **Persistance** : Sauvegarde dans MySQL (Table `mesure`).
4. **Notification** : Le Backend renvoie un ordre MQTT à l'ESP32 pour allumer la LED correspondante (Rouge/Jaune/Vert).
5. **Visualisation** : Angular -> Requête HTTP GET toutes les 5s -> Mise à jour du Dashboard.

---

## 🐳 4. Guide de Déploiement Docker Hub

### Pré-requis
- Un compte sur **Docker Hub**.
- Docker Desktop installé localement.

### Étapes de déploiement
1. **Build des images** :
   ```powershell
   docker-compose build
   ```
2. **Tag et Push vers Docker Hub** :
   Remplacez `VOTRE_USER` par votre identifiant Docker Hub (ex: `ahmedlakdhar`).
   ```powershell
   # Pour le Backend
   docker tag sttgo-backend VOTRE_USER/sttgo-backend:latest
   docker push VOTRE_USER/sttgo-backend:latest

   # Pour le Frontend
   docker tag sttgo-frontend VOTRE_USER/sttgo-frontend:latest
   docker push VOTRE_USER/sttgo-frontend:latest
   ```
3. **Mise à jour du serveur de production** :
   - Installer Docker et Docker Compose sur votre serveur.
   - Configurer les variables d'environnement (`SPRING_DATASOURCE_URL`, `MQTT_BROKER_URL`).

---

## 🛠️ 5. Ports et Services (Récapitulatif)
- **Frontend** : 80 (HTTP)
- **Backend** : 8889 (API)
- **MQTT Broker** : 1883
- **MySQL** : 3306 (Interne) / 3307 (Externe)
