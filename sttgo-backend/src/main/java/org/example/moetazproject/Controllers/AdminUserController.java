package org.example.moetazproject.Controllers;

import org.example.moetazproject.Entities.Invitation;
import org.example.moetazproject.Entities.User;
import org.example.moetazproject.Repositories.InvitationRepository;
import org.example.moetazproject.Repositories.UserRepository;
import org.example.moetazproject.Services.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import org.springframework.security.core.Authentication;
import java.util.UUID;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
@CrossOrigin("*")
public class AdminUserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InvitationRepository invitationRepository;

    @Autowired
    private EmailService emailService;

    @GetMapping
    public List<User> getAllUsers(Authentication auth) {
        List<User> all = userRepository.findAll();
        
        // On vérifie si l'utilisateur actuel est SUPER_ADMIN
        boolean isSuperAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"));

        if (!isSuperAdmin) {
            // Cacher les comptes SUPER_ADMIN pour tous les autres (ADMIN simples et WORKER)
            return all.stream()
                    .filter(u -> !"SUPER_ADMIN".equals(u.getRole()))
                    .collect(Collectors.toList());
        }
        
        return all;
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<?> activateUser(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        
        user.setEnabled(true);
        if (body != null && body.containsKey("role")) {
            user.setRole(body.get("role"));
        } else if (user.getRole() == null || user.getRole().isEmpty()) {
            user.setRole("WORKER");
        }
        
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("status", "activated", "user", user.getUsername()));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user != null && "SUPER_ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(403).body(Map.of("error", "Impossible de supprimer l'administrateur racine."));
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @PostMapping("/invite")
    public ResponseEntity<?> inviteUser(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String role = request.get("role"); // Nouveau: choix du rôle
        
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "L'email est requis."));
        }

        if (role == null || role.isEmpty()) {
            role = "WORKER";
        }

        // Vérifier si l'utilisateur existe déjà
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Un utilisateur avec cet email existe déjà."));
        }

        // Générer un token unique
        String token = UUID.randomUUID().toString();
        
        Invitation invitation = new Invitation();
        invitation.setEmail(email);
        invitation.setToken(token);
        invitation.setRole(role);
        invitation.setExpiryDate(LocalDateTime.now().plusDays(7)); // Expire dans 7 jours
        invitation.setUsed(false);
        
        invitationRepository.save(invitation);
        
        // Envoyer l'email
        emailService.sendInvitationEmail(email, token);
        
        return ResponseEntity.ok(Map.of("status", "invited", "message", "Invitation envoyée à " + email));
    }
}
