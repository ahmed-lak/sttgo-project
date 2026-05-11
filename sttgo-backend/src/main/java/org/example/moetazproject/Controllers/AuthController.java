package org.example.moetazproject.Controllers;

import org.example.moetazproject.Entities.User;
import org.example.moetazproject.Repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.example.moetazproject.Services.EmailService;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (user.getEmail() == null || user.getEmail().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        
        // On utilise l'email comme nom d'utilisateur unique
        user.setUsername(user.getEmail());
        
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "A user with this email already exists"));
        }
        
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole("WORKER");
        user.setEnabled(false); // Doit être validé par un admin
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of("status", "success", "message", "User registered, waiting for admin validation."));
    }

    @RequestMapping(value = "/login", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<?> login(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }
        
        User user = userRepository.findByUsername(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }
        
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "role", user.getRole(),
                "username", user.getUsername(),
                "nom", user.getNom() != null ? user.getNom() : "",
                "prenom", user.getPrenom() != null ? user.getPrenom() : ""
        ));
    }

    /**
     * Endpoint de secours pour créer/réparer le compte admin.
     * Accessible via : GET http://localhost:8889/api/auth/setup
     */
    @GetMapping("/setup")
    public ResponseEntity<?> setup() {
        final String ADMIN_EMAIL = "admin@sttgo.com";
        var existing = userRepository.findByUsername(ADMIN_EMAIL);
        
        if (existing.isPresent()) {
            User admin = existing.get();
            admin.setEnabled(true);
            admin.setRole("SUPER_ADMIN");
            userRepository.save(admin);
            return ResponseEntity.ok(Map.of("status", "repaired", "message", "Admin account repaired: enabled=true, role=SUPER_ADMIN"));
        }
        
        User admin = new User();
        admin.setUsername(ADMIN_EMAIL);
        admin.setEmail(ADMIN_EMAIL);
        admin.setNom("System");
        admin.setPrenom("Admin");
        admin.setPoste("Administrateur Plateforme");
        admin.setPassword(passwordEncoder.encode("admin"));
        admin.setRole("SUPER_ADMIN");
        admin.setEnabled(true);
        userRepository.save(admin);
        
        return ResponseEntity.ok(Map.of("status", "created", "message", "Admin account created: admin@sttgo.com / admin"));
    }

    /**
     * Endpoint de réinitialisation du compte admin.
     * Accessible via : GET http://localhost:8889/api/auth/reset-admin
     * Remet à jour le compte "admin" avec le mot de passe "admin123" et le rôle ADMIN.
     */
    @GetMapping("/reset-admin")
    public ResponseEntity<?> resetAdmin() {
        // Chercher le compte "admin" (ancien) OU "admin@sttgo.com" (nouveau)
        var userOpt = userRepository.findByUsername("admin");
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername("admin@sttgo.com");
        }

        if (userOpt.isEmpty()) {
            // Créer un tout nouveau compte "admin" avec mot de passe "admin123"
            User admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@sttgo.com");
            admin.setNom("System");
            admin.setPrenom("Admin");
            admin.setPoste("Administrateur");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("SUPER_ADMIN");
            admin.setEnabled(true);
            userRepository.save(admin);
            return ResponseEntity.ok(Map.of("status", "created", "username", "admin", "password", "admin123"));
        }

        // Mettre à jour le compte existant
        User admin = userOpt.get();
        admin.setUsername("admin");
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setRole("SUPER_ADMIN");
        admin.setEnabled(true);
        userRepository.save(admin);

        return ResponseEntity.ok(Map.of(
            "status", "updated",
            "username", "admin",
            "password", "admin123",
            "message", "Compte admin mis à jour ! Connectez-vous avec admin / admin123"
        ));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String token = UUID.randomUUID().toString();
            user.setResetToken(token);
            userRepository.save(user);
            emailService.sendResetPasswordEmail(user.getEmail(), token);
            return ResponseEntity.ok(Map.of("message", "Reset email sent successfully."));
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "No user found with this email."));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("password");

        if (token == null || token.isEmpty() || newPassword == null || newPassword.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Token and password are required"));
        }

        Optional<User> userOpt = userRepository.findByResetToken(token);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setPassword(passwordEncoder.encode(newPassword));
            user.setResetToken(null);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Password reset successfully."));
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired token."));
        }
    }
}
