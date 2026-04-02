package org.example.moetazproject.Entities;


import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

@Entity
@Data
public class Citerne {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String produit; // Hexane, Diesel, Huile
    private String type;    // "HORIZONTAL" ou "VERTICAL"

    private double capaciteMax; // en Litres
    private double longueur;    // en cm (pour horizontal)
    private double diametre;    // en cm
    private double hauteurTotale; // en cm (pour vertical)

    public double getHauteurTotale() {
        return hauteurTotale;
    }

    public void setHauteurTotale(double hauteurTotale) {
        this.hauteurTotale = hauteurTotale;
    }

    public double getDiametre() {
        return diametre;
    }

    public void setDiametre(double diametre) {
        this.diametre = diametre;
    }

    public double getLongueur() {
        return longueur;
    }

    public void setLongueur(double longueur) {
        this.longueur = longueur;
    }

    public double getCapaciteMax() {
        return capaciteMax;
    }

    public void setCapaciteMax(double capaciteMax) {
        this.capaciteMax = capaciteMax;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getProduit() {
        return produit;
    }

    public void setProduit(String produit) {
        this.produit = produit;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }
}
