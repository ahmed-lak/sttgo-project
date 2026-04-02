import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:8889/api';

  constructor(private http: HttpClient) {}

login(username: string, password: string) {
  const token = btoa(username + ':' + password);
  // Utilise "Authorization" avec un grand A
  const headers = new HttpHeaders().set('Authorization', 'Basic ' + token);

  return this.http.get(`http://localhost:8889/api/niveaux`, { headers }).pipe(
    tap(() => {
      localStorage.setItem('credentials', token);
    })
  );
}
  getHeaders() {
    const creds = localStorage.getItem('credentials');
    return new HttpHeaders({ authorization: 'Basic ' + creds });
  }

  logout() {
    localStorage.removeItem('credentials');
  }
}