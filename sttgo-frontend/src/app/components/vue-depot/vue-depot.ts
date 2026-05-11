import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SurveillanceService } from '../../Services/surveillance';
import { GroupedDepot } from '../dashboard/dashboard'; // On peut réutiliser l'interface si besoin, ou la redéfinir
import { Mesure } from '../../models/Mesure';
import { Depot } from '../../models/Depot';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../Services/auth';

@Component({
  selector: 'app-vue-depot',
  standalone: false,
  templateUrl: './vue-depot.html',
  styleUrl: './vue-depot.css'
})
export class VueDepot implements OnInit, OnDestroy {
  depotId!: number;
  depot: Depot | null = null;
  mesures: Mesure[] = [];
  intervalId: any;
  isLoading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private surveillanceService: SurveillanceService,
    private cdr: ChangeDetectorRef,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.depotId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.depotId) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.chargerDonnees();
    this.intervalId = setInterval(() => this.chargerDonnees(), 5000);
  }

  chargerDonnees() {
    forkJoin({
      toutesMesures: this.surveillanceService.getNiveauxActuels(),
      tousDepots: this.surveillanceService.getDepots()
    }).subscribe({
      next: (res) => {
        this.depot = res.tousDepots.find(d => d.id === this.depotId) || null;
        if (!this.depot) {
          this.isLoading = false;
          return;
        }
        
        // On filtre les mesures pour ce dépôt spécifique
        this.mesures = res.toutesMesures.filter(m => m.citerne.depot && m.citerne.depot.id === this.depotId);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Erreur chargement VueDepot", err);
        this.isLoading = false;
      }
    });
  }

  // Couleurs par type de produit
  getProduitColor(produit: string | undefined | null): string {
    if (!produit) return '#64748b'; 
    const p = produit.toLowerCase();
    if (p.includes('gasoil')) return '#10b981'; // Green for Gasoil
    if (p.includes('hexane')) return '#2563eb'; // Blue for Hexane
    if (p.includes('huile')) return '#eab308';  // Yellow for Huile
    return '#64748b'; 
  }

  getColor(p: number, produit?: string): string {
    if (p < 20) return '#ef4444'; // Alerte critique rouge (< 20%)
    
    // Sinon, couleur fixe selon le type de produit
    return this.getProduitColor(produit);
  }

  retour() {
    this.router.navigate(['/dashboard']);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
