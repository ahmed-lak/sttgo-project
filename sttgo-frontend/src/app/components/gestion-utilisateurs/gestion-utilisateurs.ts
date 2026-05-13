import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../Services/auth';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-gestion-utilisateurs',
  standalone: false,
  templateUrl: './gestion-utilisateurs.html',
  styleUrl: './gestion-utilisateurs.css'
})
export class GestionUtilisateurs implements OnInit {
  users: any[] = [];
  loading = true;
  error = '';
  inviteEmail = '';
  inviteRole = 'WORKER';
  inviteLoading = false;
  inviteMessage = '';

  constructor(
    public auth: AuthService, 
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  onInvite() {
    if (!this.inviteEmail) return;
    this.inviteLoading = true;
    this.inviteMessage = '';

    this.http.post('/api/admin/users/invite', { 
      email: this.inviteEmail, 
      role: this.inviteRole 
    }, {
      headers: this.auth.getHeaders()
    }).subscribe({
      next: (res: any) => {
        this.inviteLoading = false;
        this.inviteMessage = "✅ " + res.message;
        this.inviteEmail = '';
        setTimeout(() => this.inviteMessage = '', 5000);
      },
      error: (err: any) => {
        this.inviteLoading = false;
        this.inviteMessage = "❌ " + (err.error?.error || "Erreur lors de l'invitation.");
      }
    });
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.error = '';
    const creds = localStorage.getItem('credentials');

    if (!creds) {
      this.error = 'Vous devez vous connecter en tant qu\'administrateur.';
      this.loading = false;
      return;
    }

    this.http.get<any[]>('/api/admin/users', {
      headers: this.auth.getHeaders()
    }).subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Fetch error:', err);
        if (err.status === 401) {
          this.error = 'Accès refusé (401) : Identifiants invalides ou droits ADMIN manquants.';
        } else if (err.status === 403) {
          this.error = 'Accès interdit (403) : Rôle ADMIN requis.';
        } else {
          this.error = 'Impossible de joindre le serveur backend. Vérifiez qu\'il est bien démarré.';
        }
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  validateUser(user: any, role: string) {
    this.http.put(`/api/admin/users/${user.id}/activate`, { role }, {
      headers: this.auth.getHeaders()
    }).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (err) => {
        console.error('Validation error:', err);
        alert('Erreur lors de la validation.');
      }
    });
  }

  deleteUser(userId: number) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    this.http.delete(`/api/admin/users/${userId}`, {
      headers: this.auth.getHeaders()
    }).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (err) => {
        console.error('Delete error:', err);
        alert('Erreur lors de la suppression.');
      }
    });
  }

  logout() {
    this.auth.logout();
    window.location.href = '/';
  }
}

