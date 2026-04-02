package org.example.moetazproject.Services;

import org.example.moetazproject.Entities.User;
import org.example.moetazproject.Repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class MyUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // 1. Chercher l'utilisateur dans la table 'users'
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur inconnu: " + username));

        // 2. Transformer ton entité User en UserDetails (compris par Spring Security)
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPassword()) // Le mot de passe haché de la BDD
                .roles(user.getRole())        // Le rôle (ADMIN)
                .build();
    }
}