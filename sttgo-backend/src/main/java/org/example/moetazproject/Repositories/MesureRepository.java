package org.example.moetazproject.Repositories;

import org.example.moetazproject.Entities.Mesure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MesureRepository extends JpaRepository<Mesure, Long> {
    List<Mesure> findByCiterneIdOrderByDateMesureDesc(Long citerneId);
    Optional<Mesure> findFirstByCiterneIdOrderByDateMesureDesc(Long citerneId);
    List<Mesure> findTop100ByCiterneIdOrderByDateMesureDesc(Long citerneId);
}
