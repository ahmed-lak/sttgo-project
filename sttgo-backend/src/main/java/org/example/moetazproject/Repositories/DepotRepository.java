package org.example.moetazproject.Repositories;

import org.example.moetazproject.Entities.Depot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DepotRepository extends JpaRepository<Depot, Long> {
    java.util.List<Depot> findAllByOrderByOrdreAsc();
}
