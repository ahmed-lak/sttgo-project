import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8889/api';

  constructor(private http: HttpClient) { }

  login(email: string, password: string) {
    const token = btoa(email + ':' + password);
    const headers = new HttpHeaders().set('Authorization', 'Basic ' + token);

    return this.http.post<any>(`${this.apiUrl}/auth/login`, {}, { headers }).pipe(
      tap((res) => {
        sessionStorage.setItem('credentials', token);
        sessionStorage.setItem('user_role', res.role);
        sessionStorage.setItem('user_name', res.nom + ' ' + res.prenom);
        sessionStorage.setItem('user_email', res.username);
      })
    );
  }

  register(userData: any) {
    return this.http.post(`${this.apiUrl}/auth/register`, userData);
  }

  isAdmin(): boolean {
    const role = sessionStorage.getItem('user_role');
    const email = sessionStorage.getItem('user_email');
    // Sécurité supplémentaire : l'email admin@sttgo.com est toujours admin
    return role === 'ADMIN' || role === 'SUPER_ADMIN' || email === 'admin@sttgo.com';
  }

  getUserName(): string {
    return sessionStorage.getItem('user_name') || 'Utilisateur';
  }
  getHeaders() {
    const creds = sessionStorage.getItem('credentials');
    return new HttpHeaders().set('Authorization', 'Basic ' + creds);
  }

  logout() {
    sessionStorage.clear();
  }

  forgotPassword(email: string) {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(data: any) {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, data);
  }
}