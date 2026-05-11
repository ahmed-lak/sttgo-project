package org.example.moetazproject.Services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendCriticalAlert(String tankName, double level) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("sttgo-alerts@example.com");
            message.setTo("admin@sttgo.com"); // À adapter selon vos besoins
            message.setSubject("⚠️ ALERTE CRITIQUE : Niveau Citerne " + tankName);
            message.setText("Attention,\n\nLe niveau de la citerne '" + tankName + "' a atteint un seuil critique de " + String.format("%.2f", level) + "%.\n\nVeuillez vérifier l'installation rapidement.\n\nL'équipe STTGO.");
            mailSender.send(message);
            System.out.println("Email d'alerte envoyé pour : " + tankName);
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email d'alerte : " + e.getMessage());
        }
    }

    public void sendResetPasswordEmail(String userEmail, String token) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("sttgo-auth@example.com");
            message.setTo(userEmail);
            message.setSubject("Réinitialisation de votre mot de passe - STTGO");
            
            // Lien vers le frontend (port 80 pour Docker)
            String resetLink = "http://localhost/reset-password?token=" + token;
            
            message.setText("Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe.\n" +
                    "Veuillez cliquer sur le lien ci-dessous pour choisir un nouveau mot de passe :\n\n" +
                    resetLink + "\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\nCordialement,\nL'équipe STTGO.");
            
            mailSender.send(message);
            System.out.println("Email de réinitialisation envoyé à : " + userEmail);
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email de réinitialisation : " + e.getMessage());
        }
    }
}
