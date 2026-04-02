import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { SurveillanceService } from '../../Services/surveillance';
import { Mesure } from '../../models/Mesure';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  mesures: Mesure[] = [];            // Toutes les données brutes
  mesuresFiltrees: Mesure[] = [];    // Ce qui est affiché après filtrage
  produitsDisponibles: string[] = []; // Liste dynamique (Gasoil, Essence, etc.)
  filtreActuel: string = 'TOUT';
  
  intervalId: any;
  isLoading: boolean = true;

  constructor(
    private surveillanceService: SurveillanceService,
    private router: Router,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit(): void {
    if (!localStorage.getItem('credentials')) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.chargerDonnees();
    this.intervalId = setInterval(() => this.chargerDonnees(), 5000);
  }

  chargerDonnees() {
    this.surveillanceService.getNiveauxActuels().subscribe({
      next: (data: Mesure[]) => {
        this.mesures = data.sort((a, b) => a.citerne.nom.localeCompare(b.citerne.nom));
        
        this.produitsDisponibles = Array.from(new Set(data.map(m => m.citerne.produit))).sort();

        this.appliquerFiltre();
        
        this.isLoading = false;
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('Erreur:', err);
        this.isLoading = false;
      },
    });
  }

  setFiltre(type: string) {
    this.filtreActuel = type;
    this.appliquerFiltre();
  }

  appliquerFiltre() {
    if (this.filtreActuel === 'TOUT') {
      this.mesuresFiltrees = this.mesures;
    } else {
      this.mesuresFiltrees = this.mesures.filter(m => m.citerne.produit === this.filtreActuel);
    }
  }

  // Couleurs par type de produit
  getProduitColor(produit: string): string {
    const p = produit.toLowerCase();
    if (p.includes('gasoil')) return '#3b82f6';
    if (p.includes('essence')) return '#10b981';
    if (p.includes('hexane')) return '#a855f7';  
    if (p.includes('huile')) return '#f59e0b';   
    return '#94a3b8'; 
  }

  getColor(p: number): string {
    if (p > 90) return '#ef4444'; 
    if (p < 15) return '#f59e0b'; 
    return '#3b82f6'; 
  }

  getStatusLabel(p: number): string {
    if (p > 90) return 'Critique';
    if (p < 15) return 'Bas';
    return 'Normal';
  }

  getStatusClass(p: number): string {
    if (p > 90) return 'status-critical';
    if (p < 15) return 'status-low';
    return 'status-normal';
  }

  logout() {
    localStorage.removeItem('credentials');
    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}