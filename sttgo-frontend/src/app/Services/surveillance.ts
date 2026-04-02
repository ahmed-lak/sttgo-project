import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Mesure } from '../models/Mesure';
import { AuthService } from './auth';


@Injectable({
  providedIn: 'root'
})
export class SurveillanceService {
  private apiUrl = 'http://localhost:8889/api';

constructor(private http: HttpClient, private auth: AuthService) { }

getNiveauxActuels(): Observable<Mesure[]> {
  return this.http.get<Mesure[]>(`${this.apiUrl}/niveaux`, { headers: this.auth.getHeaders() });
}


// Récupère l'historique d'une citerne (Graphiques)
getHistorique(citerneId: number): Observable<Mesure[]> {
  return this.http.get<Mesure[]>(`${this.apiUrl}/historique/${citerneId}`, { 
    headers: this.auth.getHeaders() 
  });
}
getCiternes(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/GetAllCiternes`, { headers: this.auth.getHeaders() });
}
getConsommation(id: number): Observable<any> {
  return this.http.get(`${this.apiUrl}/consommation/${id}`, { 
    headers: this.auth.getHeaders() 
  });
}

saveCiterne(citerne: any): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/citernes`, citerne, { headers: this.auth.getHeaders() });
}

deleteCiterne(id: number): Observable<any> {
  return this.http.delete<any>(`${this.apiUrl}/citernes/${id}`, { headers: this.auth.getHeaders() });
}
}