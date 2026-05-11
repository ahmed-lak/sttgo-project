package org.example.moetazproject.Controllers;

import org.example.moetazproject.Entities.Depot;
import org.example.moetazproject.Repositories.DepotRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/depots")
@CrossOrigin("*")
public class DepotController {

    @Autowired
    private DepotRepository depotRepo;

    @GetMapping
    public List<Depot> getAllDepots() {
        return depotRepo.findAllByOrderByOrdreAsc();
    }

    @PostMapping
    public Depot saveDepot(@RequestBody Depot depot) {
        return depotRepo.save(depot);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDepot(@PathVariable Long id) {
        depotRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
