import { Component, OnInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { SurveillanceService } from '../../Services/surveillance';
import { ActivatedRoute, Router } from '@angular/router';

Chart.register(...registerables);

@Component({
  selector: 'app-historique',
  standalone: false,
  templateUrl: './historique.html',
  styleUrl: './historique.css',
})
export class Historique implements OnInit, OnDestroy {
  @ViewChild('historiqueChart') chartCanvas!: ElementRef;
  
  citerneId!: number;
  chart: any;
  isLoading: boolean = true;
  errorMessage: string = '';
  
  // Stats de consommation
  stats: any = { jour: 0, semaine: 0, mois: 0 };

  constructor(
    private surveillanceService: SurveillanceService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit(): void {
    this.citerneId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.citerneId) { this.retour(); return; }
    this.chargerDonnees();
  }

  chargerDonnees() {
    this.isLoading = true;
    // 1. Charger l'historique pour le graph
    this.surveillanceService.getHistorique(this.citerneId).subscribe({
      next: (data) => {
        this.isLoading = false;
        if (data && data.length > 0) {
          this.cdr.detectChanges(); 
          this.creerGraphique(data);
        } else {
          this.errorMessage = "Aucune donnée disponible.";
        }
      },
      error: () => { this.isLoading = false; this.errorMessage = "Erreur serveur."; }
    });

    this.surveillanceService.getConsommation(this.citerneId).subscribe({
      next: (res) => this.stats = res
    });
  }

  creerGraphique(data: any[]) {
    const sortedData = data.sort((a, b) => new Date(a.dateMesure).getTime() - new Date(b.dateMesure).getTime());
    const labels = sortedData.map(m => {
      const d = new Date(m.dateMesure);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + 
             d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' });
    });
    const volumes = sortedData.map(m => m.volume);

    if (this.chart) this.chart.destroy();
    if (!this.chartCanvas) return;

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Volume (L)',
          data: volumes,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  retour() { this.router.navigate(['/dashboard']); }
  logout() { localStorage.removeItem('credentials'); this.router.navigate(['/login']); }
  ngOnDestroy() { if (this.chart) this.chart.destroy(); }
}