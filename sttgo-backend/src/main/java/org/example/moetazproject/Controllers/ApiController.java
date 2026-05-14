package org.example.moetazproject.Controllers;

import org.example.moetazproject.Entities.Citerne;
import org.example.moetazproject.Entities.Mesure;
import org.example.moetazproject.Repositories.CiterneRepository;
import org.example.moetazproject.Repositories.MesureRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin("*")
public class ApiController {

    @Autowired
    private CiterneRepository citerneRepo;
    @Autowired
    private MesureRepository mesureRepo;

    // 1. RECEPTION ESP32 (POST)
    @PostMapping("/mesure")
    public ResponseEntity<?> recevoirMesure(@RequestBody Map<String, Object> payload) {
        Long id = Long.valueOf(payload.get("citerne_id").toString());
        double niveau = Double.parseDouble(payload.get("niveau").toString());

        Citerne c = citerneRepo.findById(id).orElseThrow();

        Mesure m = new Mesure();
        // Important : setCiterne D'ABORD, pour que setNiveau puisse faire le calcul
        // avec la capacité !
        m.setCiterne(c);
        m.setNiveau(niveau);
        m.setDateMesure(LocalDateTime.now()); // S'assurer que la date est mise à jour

        mesureRepo.save(m);
        return ResponseEntity.ok(Map.of("status", "success"));
    }

    @GetMapping("/consommation/{id}")
    public ResponseEntity<?> getConsommation(@PathVariable Long id) {
        List<Mesure> historique = mesureRepo.findByCiterneIdOrderByDateMesureDesc(id);

        if (historique.isEmpty()) {
            return ResponseEntity.ok(Map.of("jour", 0, "semaine", 0, "mois", 0, "annee", 0, "total", 0));
        }

        LocalDateTime maintenant = LocalDateTime.now();

        double consoJour = calculerSommeConsommations(historique, maintenant.minusHours(24));
        double consoSemaine = calculerSommeConsommations(historique, maintenant.minusDays(7));
        double consoMois = calculerSommeConsommations(historique, maintenant.minusDays(30));
        double consoAnnee = calculerSommeConsommations(historique, maintenant.minusYears(1));
        
        // Consommation Totale : On cumule tout l'historique disponible
        double consoTotale = calculerSommeConsommations(historique, LocalDateTime.of(2000, 1, 1, 0, 0));

        return ResponseEntity.ok(Map.of(
                "jour", Math.max(0, consoJour),
                "semaine", Math.max(0, consoSemaine),
                "mois", Math.max(0, consoMois),
                "annee", Math.max(0, consoAnnee),
                "total", Math.max(0, consoTotale)));
    }

    @GetMapping("/consommation-range/{id}")
    public ResponseEntity<?> getConsommationRange(
            @PathVariable Long id,
            @RequestParam String start,
            @RequestParam String end) {
        
        LocalDateTime dateStart = LocalDateTime.parse(start);
        LocalDateTime dateEnd = LocalDateTime.parse(end);
        
        List<Mesure> mesures = mesureRepo.findByCiterneIdAndDateMesureBetweenOrderByDateMesureDesc(id, dateStart, dateEnd);
        
        if (mesures.isEmpty()) return ResponseEntity.ok(Map.of("conso", 0));

        double conso = calculerSommeConsommations(mesures, dateStart);
        
        return ResponseEntity.ok(Map.of("conso", Math.max(0, conso)));
    }

    @GetMapping("/historique-range/{id}")
    public List<Mesure> getHistoriqueRange(
            @PathVariable Long id,
            @RequestParam String start,
            @RequestParam String end) {
        
        LocalDateTime dateStart = LocalDateTime.parse(start);
        LocalDateTime dateEnd = LocalDateTime.parse(end);
        
        return mesureRepo.findByCiterneIdAndDateMesureBetweenOrderByDateMesureDesc(id, dateStart, dateEnd);
    }

    private double calculerSommeConsommations(List<Mesure> historique, LocalDateTime limite) {
        double totalConso = 0;
        for (int i = 0; i < historique.size() - 1; i++) {
            Mesure mRecente = historique.get(i);
            Mesure mAncienne = historique.get(i + 1);

            if (mRecente.getDateMesure().isAfter(limite)) {
                double difference = mAncienne.getVolume() - mRecente.getVolume();
                if (difference > 0) {
                    totalConso += difference;
                }
            } else {
                break;
            }
        }
        return Math.round(totalConso * 100.0) / 100.0;
    }

    // 3. DASHBOARD (GET) - Derniers niveaux de toutes les citernes
    @GetMapping("/niveaux")
    public List<Mesure> getNiveaux() {
        return citerneRepo.findAll().stream()
                .map(c -> mesureRepo.findFirstByCiterneIdOrderByDateMesureDesc(c.getId()).orElseGet(() -> {
                    Mesure m = new Mesure();
                    m.setCiterne(c);
                    m.setNiveau(0.0);
                    m.setPourcentage(0.0);
                    m.setVolume(0.0);
                    return m;
                }))
                .collect(Collectors.toList());
    }

    // 4. HISTORIQUE (GET)
    @GetMapping("/historique/{id}")
    public List<Mesure> getHistorique(@PathVariable Long id) {
        return mesureRepo.findTop100ByCiterneIdOrderByDateMesureDesc(id);
    }

    @PostMapping("/citernes")
    public Citerne saveCiterne(@RequestBody Citerne c) {
        // Logique hybride : Si l'ID est fourni par l'utilisateur, on l'utilise.
        // Sinon, on calcule l'ID suivant (MAX + 1).
        if (c.getId() == null || c.getId() == 0) {
            Long maxId = citerneRepo.findMaxId();
            c.setId(maxId == null ? 1L : maxId + 1);
        }
        return citerneRepo.save(c);
    }

    // 6. LISTER TOUTES LES CITERNES (GET)
    @GetMapping("/GetAllCiternes")
    public List<Citerne> getCiternes() {
        return citerneRepo.findAll();
    }

    // 7. SUPPRIMER UNE CITERNE (DELETE)
    @DeleteMapping("/citernes/{id}")
    @Transactional
    public ResponseEntity<?> deleteCiterne(@PathVariable Long id) {
        mesureRepo.deleteByCiterneId(id);
        citerneRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}