package org.example.moetazproject.Services;

import org.example.moetazproject.Entities.User;
import org.example.moetazproject.Repositories.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Service d'initialisation automatique des données au démarrage.
 * Garantit qu'un compte administrateur actif existe toujours en base.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.example.moetazproject.Repositories.DepotRepository depotRepository;
    private final org.example.moetazproject.Repositories.CiterneRepository citerneRepository;
    private final org.example.moetazproject.Repositories.MesureRepository mesureRepository;

    public DataInitializer(UserRepository userRepository, 
                           PasswordEncoder passwordEncoder,
                           org.example.moetazproject.Repositories.DepotRepository depotRepository,
                           org.example.moetazproject.Repositories.CiterneRepository citerneRepository,
                           org.example.moetazproject.Repositories.MesureRepository mesureRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.depotRepository = depotRepository;
        this.citerneRepository = citerneRepository;
        this.mesureRepository = mesureRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        // 1. INITIALISATION ADMIN
        final String ADMIN_USERNAME = "adminsttgo@gmail.com";
        var existingAdmin = userRepository.findByUsername(ADMIN_USERNAME);

        if (existingAdmin.isEmpty()) {
            User admin = new User();
            admin.setUsername(ADMIN_USERNAME);
            admin.setEmail(ADMIN_USERNAME);
            admin.setNom("System");
            admin.setPrenom("Admin");
            admin.setPoste("Administrateur");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("SUPER_ADMIN");
            admin.setEnabled(true);
            userRepository.save(admin);
            System.out.println(">>> Compte '" + ADMIN_USERNAME + "' créé.");
        } else {
            System.out.println(">>> Compte admin OK.");
        }

        // 2. INITIALISATION DEPOT
        if (depotRepository.count() == 0) {
            org.example.moetazproject.Entities.Depot d = new org.example.moetazproject.Entities.Depot();
            d.setNom("Dépôt Principal ");
            d.setLocalisation("Zone nord");
            d.setProduit("Gasoil");
            depotRepository.save(d);
            System.out.println(">>> Dépôt par défaut créé.");
        }

        // 3. INITIALISATION CITERNE
        if (citerneRepository.count() == 0 && depotRepository.count() > 0) {
            var depots = depotRepository.findAll();
            if (!depots.isEmpty()) {
                org.example.moetazproject.Entities.Citerne c = new org.example.moetazproject.Entities.Citerne();
                c.setId(1L);
                c.setNom("Citerne A1");
                c.setProduit("Gasoil");
                c.setType("VERTICAL");
                c.setCapaciteMax(10000);
                c.setHauteurTotale(300);
                c.setDiametre(200);
                c.setDepot(depots.get(0));
                citerneRepository.save(c);
                System.out.println(">>> Citerne par défaut créée.");
            }
        }
    }
}
