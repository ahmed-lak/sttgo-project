import { Component, OnInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { SurveillanceService } from '../../Services/surveillance';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../Services/auth';
import { Mesure } from '../../models/Mesure';

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
  stats: any = { jour: 0, semaine: 0, mois: 0, annee: 0, total: 0, range: 0 };

  intervalId: any;

  // Filtrage par calendrier
  dateDebut: string = '';
  dateFin: string = '';
  isFiltering: boolean = false;
  hasCustomFilter: boolean = false;

  constructor(
    private surveillanceService: SurveillanceService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.citerneId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.citerneId) { this.retour(); return; }
    
    // Initialiser les dates par défaut (Aujourd'hui)
    const todayStr = new Date().toISOString().split('T')[0];
    this.dateFin = todayStr;
    this.dateDebut = todayStr;

    this.chargerDonnees();

    // Rafraîchir les données toutes les 10 secondes
    this.intervalId = setInterval(() => {
      if (this.isFiltering) return;
      
      // On ne rafraîchit que si la période affichée inclut aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      if (this.dateFin >= today) {
        this.chargerDonnees(true);
      }
    }, 10000);
  }

  chargerDonnees(silent: boolean = false) {
    // 1. Mettre à jour les stats globales de consommation
    this.surveillanceService.getConsommation(this.citerneId).subscribe({
      next: (res: any) => {
        this.stats = { ...this.stats, ...res };
        this.cdr.detectChanges();
      }
    });

    // 2. Le graphique suit toujours les dates du calendrier !
    this.chargerDonneesParRange(silent);
  }

  chargerDonneesParRange(silentRefresh: boolean = false) {
    if (!this.dateDebut || !this.dateFin) return;
    
    this.hasCustomFilter = true;
    if (!silentRefresh) {
      this.isFiltering = true;
      this.isLoading = true;
    }
    // Format ISO pour le backend
    const start = `${this.dateDebut}T00:00:00`;
    const end = `${this.dateFin}T23:59:59`;

    // 1. Charger la consommation de la période
    this.surveillanceService.getConsommationRange(this.citerneId, start, end).subscribe({
      next: (res: any) => {
        this.stats.range = res.conso;
        this.cdr.detectChanges();
      }
    });

    // 2. Mettre à jour le graphique pour la période
    this.surveillanceService.getHistoriqueRange(this.citerneId, start, end).subscribe({
      next: (data: Mesure[]) => {
        this.isFiltering = false;
        this.isLoading = false;
        if (data && data.length > 0) {
          this.creerGraphique(data);
        } else {
          // Si pas de données, on vide le graphique pour ne pas induire en erreur
          if (this.chart) {
            this.chart.destroy();
            this.chart = null;
          }
          alert("Aucune donnée trouvée pour cette période.");
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.isFiltering = false;
        this.isLoading = false;
        alert("Erreur lors de la récupération des données.");
      }
    });
  }

  creerGraphique(data: any[]) {
    let sortedData = data.sort((a, b) => new Date(a.dateMesure).getTime() - new Date(b.dateMesure).getTime());
    
    // Échantillonnage intelligent (Chunk Averaging) pour les longues périodes (ex: 1 an)
    // Au lieu d'ignorer des points, on fait la moyenne des blocs pour garder une courbe précise et lisible.
    if (sortedData.length > 200) {
      const step = Math.ceil(sortedData.length / 200);
      const reducedData = [];
      for (let i = 0; i < sortedData.length; i += step) {
        const chunk = sortedData.slice(i, i + step);
        const avgVolume = chunk.reduce((sum, val) => sum + val.volume, 0) / chunk.length;
        const midPoint = chunk[Math.floor(chunk.length / 2)];
        reducedData.push({ ...midPoint, volume: avgVolume });
      }
      sortedData = reducedData;
    }

    const labels = sortedData.map(m => {
      const d = new Date(m.dateMesure);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + 
             d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' });
    });
    const volumes = sortedData.map(m => m.volume);

    // Ajuster l'affichage selon le nombre de points
    const pointRadiusValue = volumes.length > 100 ? 0 : 3;

    if (this.chart) {
      // Mise à jour fluide du graphique existant
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = volumes;
      this.chart.data.datasets[0].pointRadius = pointRadiusValue;
      this.chart.update('none'); // 'none' pour éviter les animations trop brusques à chaque refresh
    } else {
      // Premier rendu du graphique
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
            borderWidth: 2,
            pointRadius: pointRadiusValue,
            fill: true,
            tension: 0.1 // Évite les dépassements de courbe (overshoot) pour les données brutes
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
  }

  reinitialiserFiltre() {
    this.hasCustomFilter = false;
    const todayStr = new Date().toISOString().split('T')[0];
    this.dateFin = todayStr;
    this.dateDebut = todayStr;
    this.chargerDonnees();
  }

  retour() { this.router.navigate(['/dashboard']); }
  logout() { this.auth.logout(); this.router.navigate(['/login']); }
  ngOnDestroy() { 
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.chart) this.chart.destroy(); 
  }
}