package org.example.moetazproject.Repositories;

import org.example.moetazproject.Entities.Citerne;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CiterneRepository extends JpaRepository<Citerne, Long> {
}
