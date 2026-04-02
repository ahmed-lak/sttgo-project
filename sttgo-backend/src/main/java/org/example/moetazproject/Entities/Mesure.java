package org.example.moetazproject.Entities;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
public class Mesure {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Citerne citerne;

    private double niveau; // Ici: pourcentage envoyé par la carte
    private double volume; // Calculé en Litres
    private double pourcentage; // Identique à niveau

    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dateMesure = LocalDateTime.now();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Citerne getCiterne() {
        return citerne;
    }

    public void setCiterne(Citerne citerne) {
        this.citerne = citerne;
    }

    public double getNiveau() {
        return niveau;
    }

    public void setNiveau(double niveau) {
        this.niveau = niveau;
        calculerPourcentageEtVolume(); // recalcul automatique
    }

    public double getVolume() {
        return volume;
    }

    public void setVolume(double volume) {
        this.volume = volume;
    }

    public double getPourcentage() {
        return pourcentage;
    }

    public void setPourcentage(double pourcentage) {
        this.pourcentage = pourcentage;
    }

    public LocalDateTime getDateMesure() {
        return dateMesure;
    }

    public void setDateMesure(LocalDateTime dateMesure) {
        this.dateMesure = dateMesure;
    }

    public void calculerPourcentageEtVolume() {
        if (citerne == null)
            return;

        // Le 'niveau' reçu correspond maintenant au niveau physique mesuré par l'ESP32
        // On récupère la hauteur maximale de la citerne
        double hauteurMax = 0;
        if ("VERTICAL".equalsIgnoreCase(citerne.getType())) {
            hauteurMax = citerne.getHauteurTotale();
        } else {
            hauteurMax = citerne.getDiametre(); // Pour une citerne couchée, la hauteur = diamètre
        }

        // On borne le niveau lui-même par sécurité
        if (this.niveau < 0) this.niveau = 0;
        if (this.niveau > hauteurMax) this.niveau = hauteurMax;

        double capaciteMax = citerne.getCapaciteMax();

        if (hauteurMax > 0) {
            this.pourcentage = (this.niveau / hauteurMax) * 100.0;
        } else {
            this.pourcentage = 0.0;
        }

        // Sécurité : bornes pour le pourcentage
        if (this.pourcentage < 0) this.pourcentage = 0;
        if (this.pourcentage > 100) this.pourcentage = 100;

        // Calcul du volume de manière linéaire pour tous les types (vertical ou horizontal)
        this.volume = capaciteMax * (this.pourcentage / 100.0);

        // Debug console pour vérifier
        System.out.println("Mesure calculée -> niveau réel mesuré: " + this.niveau
                + " cm | pourcentage: " + this.pourcentage + "% | volume: " + this.volume + " L");
    }

}
