package org.example.moetazproject.Services;

import org.example.moetazproject.Entities.User;
import org.example.moetazproject.Repositories.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Service d'initialisation automatique des données au démarrage.
 * Crée un compte administrateur par défaut si aucun utilisateur n'existe en base.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // Vérifier si un administrateur "admin" existe déjà
        Optional<User> existingUser = userRepository.findByUsername("admin");

        if (existingUser.isEmpty()) {
            System.out.println(">>> Initialisation : Création du compte admin par défaut...");
            
            User admin = new User();
            admin.setUsername("admin");
            // Cryptage du mot de passe "admin"
            admin.setPassword(passwordEncoder.encode("admin"));
            admin.setRole("ADMIN");

            userRepository.save(admin);
            System.out.println(">>> Compte 'admin' / 'admin' créé avec succès !");
        } else {
            System.out.println(">>> Initialisation : Le compte 'admin' existe déjà, aucune action requise.");
        }
    }
}
