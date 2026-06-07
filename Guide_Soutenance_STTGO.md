# Dossier Technique et Architectural : Système de Télémétrie STTGO

Ce document retrace l'intégralité du cycle de développement (SDLC) du système de télémétrie STTGO. Il est structuré sous forme de Sprints Agiles, expliquant pour chaque étape la philosophie de conception (Mindset), les fonctions clés développées et l'interaction entre les différentes couches de l'architecture.

---

## Philosophie Globale de l'Architecture
Le système a été conçu selon le modèle des **Microservices** (orchestrés via Docker). L'objectif est d'isoler chaque responsabilité :
- Le capteur est **stupide** : il ne fait que mesurer une distance brute.
- Le backend est **intelligent** : c'est lui qui possède la logique métier (calcul des volumes, gestion des utilisateurs).
- Le frontend est **réactif** : il se contente d'afficher l'état de la base de données.
- Le Cloud est **sécurisé** : aucun accès direct n'est permis sans chiffrement SSL.

---

## SPRINT 1 : Les Fondations du Système (Backend, Base de Données, Sécurité)

### 1. Mindset et Objectifs
Le premier Sprint visait à créer le cœur du réacteur. La donnée industrielle est précieuse : elle doit être stockée de manière structurée, intègre, et accessible uniquement par des personnes autorisées. Le choix d'une **Base de Données Relationnelle (MySQL)** s'est imposé pour garantir la relation stricte entre un "Dépôt", une "Citerne" et ses "Mesures".

### 2. Modélisation des Données (La couche "Entities")
*   **Action :** Création des classes Java annotées avec `@Entity` (Spring Data JPA).
*   **Fichiers clés :** `Citerne.java`, `Mesure.java`, `Depot.java`, `User.java`.
*   **Détails techniques :** 
    - L'ORM (Hibernate) se charge de traduire ces objets Java en tables SQL.
    - Les relations sont définies informatiquement : `@ManyToOne` permet de stipuler qu'une multitude de "Mesures" appartiennent à une seule "Citerne". Cela crée automatiquement les clés étrangères (Foreign Keys) dans MySQL.

### 3. Accès aux Données (La couche "Repositories")
*   **Action :** Création d'interfaces Java étendant `JpaRepository`.
*   **Fichiers clés :** `CiterneRepository.java`, `MesureRepository.java`.
*   **Détails techniques :** Ces interfaces fournissent les méthodes natives (CRUD) pour interagir avec MySQL (`.save()`, `.findAll()`). Des requêtes personnalisées ont été ajoutées, par exemple dans `MesureRepository`, pour extraire "la toute dernière mesure de chaque citerne classée par date".

### 4. Sécurité Applicative (Authentification HTTP Basic)
*   **Action :** Sécurisation des routes API et gestion des comptes utilisateurs.
*   **Fichiers clés :** `SecurityConfig.java`, `AuthController.java`, `MyUserDetailsService.java`.
*   **Détails techniques :**
    - Les mots de passe ne sont pas stockés en clair, mais hachés avec l'algorithme cryptographique **BCrypt** (`PasswordEncoder`).
    - L'authentification a été configurée en **HTTP Basic Auth**. Les requêtes doivent inclure un Header `Authorization: Basic [Base64]`.
    - La classe `SecurityConfig` bloque toutes les routes (`.anyRequest().authenticated()`), à l'exception du point d'entrée MQTT interne.

---

## SPRINT 2 : Télémétrie et Visualisation (Couche IoT & Frontend)

### 1. Mindset et Objectifs
Le système devait communiquer avec le monde physique. Le protocole **MQTT** a été choisi pour sa légèreté par rapport à HTTP, sa tolérance aux micro-coupures réseau (Qualité de Service - QoS), et sa capacité à gérer des milliers de capteurs simultanément. Côté affichage, **Angular** a été retenu pour sa rapidité (Single Page Application).

### 2. Couche Matérielle (ESP32 et HC-SR04/DHT22)
*   **Action :** Programmation C++ des microcontrôleurs.
*   **Fichiers clés :** `esp32_citerne.ino`, `esp32_depot_env.ino`.
*   **Détails techniques :** 
    - L'ESP32 déclenche le capteur ultrason, convertit le temps d'écho en distance.
    - Il encapsule cette distance dans un format **JSON** léger (via `ArduinoJson`).
    - Il publie ce payload JSON sur le serveur MQTT vers un topic précis (ex: `citerne/mesure`).

### 3. Le Broker de Messages (Mosquitto)
*   **Action :** Configuration du serveur de redistribution.
*   **Fichiers clés :** `mosquitto.conf`, `passwd`.
*   **Détails techniques :** Le serveur agit comme un "Facteur". Il a été sécurisé en désactivant l'accès anonyme (`allow_anonymous false`). L'ESP32 doit présenter un badge (identifiant/mot de passe).

### 4. La Logique Métier (Le cerveau Spring Boot)
*   **Action :** Traitement mathématique de la donnée brute.
*   **Fichiers clés :** `MqttSubscriber.java`.
*   **Détails techniques :**
    - Spring Boot écoute en permanence le topic MQTT.
    - Lors de la réception (fonction `messageArrived()`), il extrait le JSON.
    - Il interroge la base de données pour obtenir la hauteur totale de la Citerne correspondante.
    - Il calcule le volume réel : `(Hauteur Totale - Distance) / Hauteur Totale * Capacité Max`.
    - Il sauvegarde ensuite cette donnée transformée dans la base de données.

### 5. Couche Web (Interface Angular)
*   **Action :** Création du tableau de bord utilisateur.
*   **Fichiers clés :** `dashboard.ts`, `surveillance.ts` (Service), fichiers `HTML/CSS`.
*   **Détails techniques :** 
    - Angular communique avec Spring Boot via des requêtes API REST (`HttpClient`).
    - L'interface utilise le "Data Binding" : dès que la donnée JSON est reçue de l'API, les variables TypeScript mettent instantanément à jour le code HTML pour animer la jauge de niveau d'eau.

---

## SPRINT 3 : Mise en Production et Sécurisation (Cloud & DevOps)

### 1. Mindset et Objectifs
Une application locale ne suffit pas pour l'industrie. Il fallait un environnement **Haute Disponibilité (24/7)**, portable, et invulnérable aux attaques de base. Le paradigme des **Conteneurs (Docker)** permet d'isoler les processus, garantissant que si un composant tombe, le reste du système survit.

### 2. Le Serveur et le Pare-feu (Microsoft Azure)
*   **Action :** Déploiement de la Machine Virtuelle (VM) Linux Ubuntu.
*   **Détails techniques :** 
    - Configuration du Network Security Group (NSG) pour n'ouvrir que les ports strictement nécessaires à l'extérieur : le port 1883 (pour les capteurs MQTT) et les ports 80/443 (pour le trafic Web HTTP/HTTPS). Le port de la base de données a été volontairement bloqué.

### 3. Orchestration et Déploiement (Docker Compose)
*   **Action :** Création de l'infrastructure logicielle automatisée.
*   **Fichiers clés :** `docker-compose.yml`, `Dockerfile`.
*   **Détails techniques :**
    - Le fichier compose orchestre 4 conteneurs indépendants : `mysql-db`, `mosquitto-broker`, `sttgo-backend`, `sttgo-frontend`.
    - Ils communiquent via un réseau virtuel interne (`sttgo-network`), ce qui masque la base de données et le backend au monde extérieur.

### 4. Sécurité Cryptographique (Let's Encrypt et Nginx)
*   **Action :** Chiffrement SSL/TLS des flux utilisateurs.
*   **Fichiers clés :** Fichiers générés par Certbot (`fullchain.pem`, `privkey.pem`), `nginx.conf`.
*   **Détails techniques :**
    - **Certbot** a généré les certificats officiels, stockés sur l'hôte Ubuntu.
    - Ces certificats ont été "montés" en lecture seule (`:ro`) dans le conteneur du Frontend (Nginx) via un "Volume Docker".
    - **Nginx** joue le rôle de vigile (Reverse Proxy) :
        - Il force la redirection de tout le trafic non chiffré (Port 80) vers le protocole chiffré (Port 443 HTTPS).
        - Il intercepte les appels destinés au serveur (ex: `/api/...`) et les route en interne vers le conteneur Spring Boot sur le port 8889, qui lui est totalement invisible depuis l'extérieur.

---
**Bilan du Projet :** L'architecture globale STTGO démontre la mise en œuvre réussie d'une chaîne de valeur complète de l'Internet des Objets : de la capture analogique d'une grandeur physique (Capteur) jusqu'à sa distribution sécurisée et asynchrone sur le Web (Cloud).
