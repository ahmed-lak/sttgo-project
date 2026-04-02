package org.example.moetazproject.Services;

import org.example.moetazproject.Entities.Citerne;
import org.springframework.stereotype.Service;

@Service
public class VolumeService {
    public double calculerVolume(double niveau, Citerne citerne) {
        double rayon = citerne.getDiametre() / 2.0;
        double volumeCm3 = 0;

        if ("VERTICAL".equalsIgnoreCase(citerne.getType())) {
            volumeCm3 = Math.PI * Math.pow(rayon, 2) * niveau;
        } else {
            double L = citerne.getLongueur();
            double h = niveau;
            double R = rayon;
            // Formule segment circulaire pour citerne horizontale
            double part1 = Math.pow(R, 2) * Math.acos((R - h) / R);
            double part2 = (R - h) * Math.sqrt(2 * R * h - Math.pow(h, 2));
            volumeCm3 = L * (part1 - part2);
        }
        return volumeCm3 / 1000.0; // Retour en Litres
    }
}
