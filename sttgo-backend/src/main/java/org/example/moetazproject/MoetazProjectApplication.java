package org.example.moetazproject;

import org.example.moetazproject.Entities.User;
import org.example.moetazproject.Repositories.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class MoetazProjectApplication {

    public static void main(String[] args) {
        SpringApplication.run(MoetazProjectApplication.class, args);
    }
    @Bean
    CommandLineRunner start(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.findByUsername("admin").isEmpty()) {
                User admin = new User();
                admin.setUsername("admin");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRole("ADMIN");
                userRepository.save(admin);
            }
        };
    }
}
