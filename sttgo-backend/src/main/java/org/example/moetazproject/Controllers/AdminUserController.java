package org.example.moetazproject.Controllers;

import org.example.moetazproject.Entities.User;
import org.example.moetazproject.Repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import org.springframework.security.core.Authentication;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
@CrossOrigin("*")
public class AdminUserController {

    @Autowired
    private UserRepository userRepository;

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
}
