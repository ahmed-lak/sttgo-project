package org.example.moetazproject.Services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

/**
 * SERVICE : EmailService
 * Ce service gère tous les envois d'e-mails de l'application (Alertes, Invitations, Mots de passe).
 */
@Service
public class EmailService {

    // JavaMailSender est l'outil standard de Spring pour envoyer des mails.
    // Il utilise les réglages (SMTP) définis dans application.properties.
    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private org.example.moetazproject.Repositories.UserRepository userRepository;

    @Value("${spring.mail.username}")
    private String mailFrom;

    @Value("${sttgo.admin.email:adminsttgo@gmail.com}")
    private String adminEmail;

    // URL publique du frontend (configurée dans application.properties ou via variable d'environnement)
    @Value("${app.frontend.url:http://localhost}")
    private String frontendUrl;

    /**
     * Récupère dynamiquement tous les e-mails des utilisateurs ADMIN et SUPER_ADMIN actifs.
     */
    private String[] getAdminEmails() {
        try {
            java.util.List<org.example.moetazproject.Entities.User> admins = 
                userRepository.findByRoleInAndEnabledTrue(java.util.Arrays.asList("ADMIN", "SUPER_ADMIN"));
            
            if (admins != null && !admins.isEmpty()) {
                return admins.stream()
                        .map(org.example.moetazproject.Entities.User::getEmail)
                        .filter(email -> email != null && !email.trim().isEmpty())
                        .toArray(String[]::new);
            }
        } catch (Exception e) {
            System.err.println("Erreur lors de la récupération des e-mails admin : " + e.getMessage());
        }
        // Fallback si aucun administrateur n'est trouvé
        return new String[]{adminEmail};
    }

    /**
     * Envoie une alerte de niveau bas pour une citerne.
     */
    public void sendCriticalAlert(String tankName, double level) {
        try {
            // SimpleMailMessage : Un objet qui contient les champs classiques d'un mail.
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(getAdminEmails()); // Destinataires principaux (tous les admins/super admins)
            message.setSubject("ALERTE CRITIQUE : Niveau Citerne " + tankName);
            message.setText("Attention,\n\nLe niveau de la citerne '" + tankName + "' a atteint un seuil critique de " + String.format("%.2f", level) + "%.\n\nVeuillez vérifier l'installation rapidement.\n\nL'équipe STTGO.");
            
            mailSender.send(message); // Envoi effectif
            System.out.println("Email d'alerte envoyé pour : " + tankName);
        } catch (Exception e) {
            System.err.println("Erreur envoi email alerte : " + e.getMessage());
        }
    }

    /**
     * Envoie un lien sécurisé pour réinitialiser le mot de passe.
     */
    public void sendResetPasswordEmail(String userEmail, String token) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(userEmail);
            message.setSubject("Réinitialisation de votre mot de passe - STTGO");
            
            // Lien vers le frontend avec le token de sécurité
            String resetLink = frontendUrl + "/reset-password?token=" + token;
            
            message.setText("Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe.\n" +
                    "Veuillez cliquer sur le lien ci-dessous pour choisir un nouveau mot de passe :\n\n" +
                    resetLink + "\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\nCordialement,\nL'équipe STTGO.");
            
            mailSender.send(message);
            System.out.println("Email de réinitialisation envoyé à : " + userEmail);
        } catch (Exception e) {
            System.err.println("Erreur envoi email reset : " + e.getMessage());
        }
    }

    /**
     * Envoie un lien d'inscription unique à un nouvel utilisateur.
     */
    public void sendInvitationEmail(String email, String token) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(email);
            message.setSubject("Invitation à rejoindre STTGO");

            // Lien d'inscription (utilise l'URL publique du frontend)
            String registrationLink = frontendUrl + "/register?token=" + token;

            message.setText("Bonjour,\n\nVous avez été invité à rejoindre la plateforme STTGO.\n" +
                    "Veuillez cliquer sur le lien ci-dessous pour créer votre compte :\n\n" +
                    registrationLink + "\n\nCe lien est à usage unique.\n\nCordialement,\nL'équipe STTGO.");

            mailSender.send(message);
            System.out.println("Email d'invitation envoyé à : " + email);
        } catch (Exception e) {
            System.err.println("Erreur envoi email invitation : " + e.getMessage());
        }
    }

    /**
     * Envoie une alerte de température critique pour un dépôt.
     */
    public void sendTemperatureAlert(String depotName, double temperature) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(getAdminEmails()); 
            message.setSubject("ALERTE TEMPÉRATURE : Dépôt " + depotName);
            message.setText("Attention,\n\nLa température dans le dépôt '" + depotName + "' a atteint un seuil critique de " + String.format("%.2f", temperature) + "°C.\n\nVeuillez vérifier l'installation rapidement.\n\nL'équipe STTGO.");
            
            mailSender.send(message);
            System.out.println("Email d'alerte température envoyé pour : " + depotName);
        } catch (Exception e) {
            System.err.println("Erreur envoi email température : " + e.getMessage());
        }
    }
}
