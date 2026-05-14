import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../Services/auth';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  username = ''; password = ''; error = '';
  isRegisterMode = false;
  isForgotMode = false;
  isResetMode = false;
  isSuccess = false;
  regData = { nom: '', prenom: '', poste: '', password: '' };
  forgotEmail = '';
  resetToken = '';
  invitationToken = '';
  newPassword = '';

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    sessionStorage.clear(); // Détruire toute session existante dès qu'on arrive au login
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        // On essaie de déterminer si c'est une invitation ou un reset
        // Dans une vraie app, on pourrait avoir des paramètres différents (ex: ?invite=xxx ou ?reset=xxx)
        // Ici on va basculer selon le mode détecté par l'URL ou simplement tenter le reset par défaut
        // MAIS si on arrive sur /register avec un token, c'est une invitation.
        
        if (this.router.url.includes('/register')) {
          this.invitationToken = token;
          this.isRegisterMode = true;
        } else {
          this.resetToken = token;
          this.isResetMode = true;
        }
      }
    });
  }

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.isForgotMode = false;
    this.error = '';
    this.isSuccess = false;
  }

  toggleForgot() {
    this.isForgotMode = !this.isForgotMode;
    this.isRegisterMode = false;
    this.error = '';
    this.isSuccess = false;
  }

  onLogin() {
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        if (err.status === 403 || err.status === 401) {
          this.error = "Identifiants invalides ou compte en attente de validation.";
        } else {
          this.error = "Erreur de connexion au serveur.";
        }
      }
    });
  }

  onRegister() {
    if (!this.invitationToken) {
      this.error = "Un jeton d'invitation est requis pour s'inscrire.";
      return;
    }

    if (!this.regData.password || !this.regData.nom) {
      this.error = "Veuillez remplir tous les champs obligatoires.";
      return;
    }

    const payload = { ...this.regData, token: this.invitationToken };

    this.auth.register(payload).subscribe({
      next: (res: any) => {
        this.isSuccess = true;
        this.error = "Compte créé avec succès ! Vous pouvez maintenant vous connecter.";
        this.isRegisterMode = false;
        // Reset form
        this.regData = { nom: '', prenom: '', poste: '', password: '' };
        this.invitationToken = '';
      },
      error: (err: any) => {
        this.isSuccess = false;
        this.error = err.error?.error || "Erreur lors de l'inscription.";
      }
    });
  }

  onForgotPassword() {
    if (!this.forgotEmail) {
      this.error = "Veuillez saisir votre email.";
      return;
    }
    this.auth.forgotPassword(this.forgotEmail).subscribe({
      next: (res: any) => {
        this.isSuccess = true;
        this.error = "Un email de réinitialisation a été envoyé.";
        this.isForgotMode = false;
      },
      error: (err) => {
        this.isSuccess = false;
        this.error = err.error?.error || "Erreur lors de l'envoi de l'email.";
      }
    });
  }

  onResetPassword() {
    if (!this.newPassword) {
      this.error = "Veuillez saisir un nouveau mot de passe.";
      return;
    }
    this.auth.resetPassword({ token: this.resetToken, password: this.newPassword }).subscribe({
      next: (res: any) => {
        this.isSuccess = true;
        this.error = "Mot de passe réinitialisé ! Vous pouvez vous connecter.";
        this.isResetMode = false;
        this.resetToken = '';
      },
      error: (err) => {
        this.isSuccess = false;
        this.error = err.error?.error || "Erreur lors de la réinitialisation.";
      }
    });
  }
}