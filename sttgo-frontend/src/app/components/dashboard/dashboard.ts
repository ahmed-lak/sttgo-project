import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit, ViewChildren, ElementRef, QueryList } from '@angular/core';
import { SurveillanceService } from '../../Services/surveillance';
import { Depot } from '../../models/Depot';
import { Mesure } from '../../models/Mesure';
import { Router } from '@angular/router';
import { forkJoin, Subject } from 'rxjs';
import { AuthService } from '../../Services/auth';
import { debounceTime } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

export interface GroupedDepot {
  depot: Depot | null;
  mesures: Mesure[];
}

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren('depotSection') depotSections!: QueryList<ElementRef>;
  mesures: Mesure[] = [];            // Toutes les données brutes
  groupedDepots: GroupedDepot[] = []; // Données groupées par Dépôt
  filteredGroupedDepots: GroupedDepot[] = [];
  produitsDisponibles: string[] = []; 
  filtreActuel: string = 'TOUT';

  // Alertes pour citernes vides ou critiques
  alertesCiternes: { nom: string, depot: string, pourcentage: number, type: string }[] = [];
  alertesVisible: boolean = true;
  
  // Nouveaux états
  collapsedDepots: Set<number> = new Set();
  isAddingDepot: boolean = false;
  newDepot: Depot = { nom: '', localisation: '', produit: 'Gasoil', ordre: 0 };
  
  intervalId: any;
  isLoading: boolean = true;
  savingDepotIds: Set<number> = new Set();
  hasUnsavedChanges: boolean = false;
  
  // Positions pour les citernes indépendantes (sauvées localement)
  posIndepX: number = 0;
  posIndepY: number = 0;
  posIndepWidth: number = 420; // Plus compact par défaut
  posIndepHeight: number = 450;

  private resizeObserver?: ResizeObserver;
  private resizeSubject = new Subject<GroupedDepot>();

  collapsedDepotIds: Set<number> = new Set();

  /**
   * CONSTRUCTEUR : C'est ici qu'on injecte les services.
   * On demande à Angular de nous fournir les outils pour parler au Backend (SurveillanceService)
   * et pour gérer l'authentification (AuthService).
   */
  constructor(
    private surveillanceService: SurveillanceService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public auth: AuthService
  ) {}

  /**
   * ngOnInit : Cette méthode s'exécute UNE FOIS quand le composant s'affiche.
   * C'est le moment idéal pour charger les données initiales.
   */
  ngOnInit(): void {
    // Étape 1 : On vérifie si l'utilisateur est connecté. Sinon, retour au login.
    if (!sessionStorage.getItem('credentials')) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Étape 2 : On charge les premières données
    this.chargerDonnees();

    // ... (Logique de chargement des positions sauvegardées) ...

    // Charger la position des indépendants depuis le navigateur
    const savedX = localStorage.getItem('sttgo_indep_x');
    const savedY = localStorage.getItem('sttgo_indep_y');
    const savedW = localStorage.getItem('sttgo_indep_w');
    const savedH = localStorage.getItem('sttgo_indep_h');
    if (savedX) this.posIndepX = parseInt(savedX, 10);
    if (savedY) this.posIndepY = parseInt(savedY, 10);
    if (savedW) this.posIndepWidth = parseInt(savedW, 10);
    if (savedH) this.posIndepHeight = parseInt(savedH, 10);

    // Initialiser le débounce pour la sauvegarde des dimensions
    this.resizeSubject.pipe(debounceTime(1000)).subscribe((group: GroupedDepot) => {
      if (group.depot) {
        this.surveillanceService.saveDepot(group.depot).subscribe({
          next: () => {
            setTimeout(() => {
              if (group.depot?.id) this.savingDepotIds.delete(group.depot.id);
              this.cdr.detectChanges();
            }, 2000); // On garde le verrou 2s de plus pour la sécurité
          },
          error: () => {
             if (group.depot?.id) this.savingDepotIds.delete(group.depot.id);
          }
        });
      } else {
        localStorage.setItem('sttgo_indep_w', this.posIndepWidth.toString());
        localStorage.setItem('sttgo_indep_h', this.posIndepHeight.toString());
      }
    });

    this.intervalId = setInterval(() => this.chargerDonnees(), 5000);
    setTimeout(() => { if ((window as any).lucide) (window as any).lucide.createIcons(); }, 200);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  ngAfterViewInit() {
    this.initResizeObserver();
    this.depotSections.changes.subscribe(() => this.initResizeObserver());
  }

  private initResizeObserver() {
    if (!this.auth.isAdmin()) return;
    if (this.resizeObserver) this.resizeObserver.disconnect();

    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const index = this.depotSections.toArray().findIndex((el: ElementRef) => el.nativeElement === entry.target);
        if (index !== -1) {
          const group = this.filteredGroupedDepots[index];
          const newWidth = Math.round((entry.target as HTMLElement).offsetWidth);
          const newHeight = Math.round((entry.target as HTMLElement).offsetHeight);

          if (group.depot) {
            const oldW = group.depot.width || 420;
            const oldH = group.depot.height || 450;
            if (Math.abs(oldW - newWidth) > 5 || Math.abs(oldH - newHeight) > 5) {
              group.depot.width = newWidth;
              group.depot.height = newHeight;
              this.hasUnsavedChanges = true;
              this.cdr.detectChanges();
            }
          } else {
             if (Math.abs(this.posIndepWidth - newWidth) > 5 || Math.abs(this.posIndepHeight - newHeight) > 5) {
              this.posIndepWidth = newWidth;
              this.posIndepHeight = newHeight;
              this.cdr.detectChanges();
            }
          }
        }
      }
    });

    this.depotSections.forEach((el: ElementRef) => this.resizeObserver?.observe(el.nativeElement));
  }




  /**
   * chargerDonnees : C'est le coeur du dashboard.
   * Elle appelle le Backend pour récupérer : les mesures, les dépôts et les citernes.
   */
  chargerDonnees() {
    forkJoin({
      mesures: this.surveillanceService.getNiveauxActuels(),
      depots: this.surveillanceService.getDepots(),
      toutesCiternes: this.surveillanceService.getCiternes()
    }).subscribe({
      next: (res: any) => {
        const data = res.mesures;
        const allDepots = res.depots;
        const citernes = res.toutesCiternes;
        
        this.mesures = data.sort((a: Mesure, b: Mesure) => a.citerne.nom.localeCompare(b.citerne.nom));
        
        // Liste restreinte aux produits demandés par l'utilisateur
        const produitsStandards = ['Gasoil', 'Hexane', 'Huile'];
        
        // On fusionne avec ce qui existe en base pour ne rien perdre
        const productsFromCisterns = citernes.map((c: any) => c.produit);
        const productsFromMeasures = data.map((m: Mesure) => m.citerne.produit);
        
        this.produitsDisponibles = Array.from(new Set([
          ...produitsStandards,
          ...productsFromCisterns,
          ...productsFromMeasures
        ]))
        .filter(p => p != null && p !== '' && produitsStandards.includes(p))
        .sort();

        // 1. Créer les groupes (tous)
        const groups: GroupedDepot[] = [];
        allDepots
          .sort((a: Depot, b: Depot) => (a.ordre || 0) - (b.ordre || 0))
          .forEach((d: Depot) => {
            const mesuresDuDepot = this.mesures.filter(m => m.citerne.depot && m.citerne.depot.id === d.id);
            
            // SI on a des changements locaux non sauvés, on garde la position/taille locale
            if (this.hasUnsavedChanges) {
              const localGroup = this.groupedDepots.find(g => g.depot && g.depot.id === d.id);
              if (localGroup && localGroup.depot) {
                d.posX = localGroup.depot.posX;
                d.posY = localGroup.depot.posY;
                d.width = localGroup.depot.width;
                d.height = localGroup.depot.height;
              }
            }
            
            groups.push({ depot: d, mesures: mesuresDuDepot });
          });
        const sansDepot = this.mesures.filter(m => !m.citerne.depot);
        if (sansDepot.length > 0) {
          groups.push({ depot: null, mesures: sansDepot });
        }
        this.groupedDepots = groups;

        // --- AUTO-LAYOUT LOGIC ---
        // Si les dépôts sont à (0,0), on leur donne une position par défaut dans une grille
        this.groupedDepots.forEach((g, i) => {
          if (g.depot && (g.depot.posX === 0 && g.depot.posY === 0)) {
            g.depot.posX = (i % 2) * 420; // Espacement réduit pour cartes de 400px
            g.depot.posY = Math.floor(i / 2) * 450;
          }
        });

        // 2. Appliquer le filtre sur les groupes
        this.appliquerFiltre();

        // 3. Vérifier les alertes (citernes vides ou critiques)
        this.verifierAlertes();
        
        this.isLoading = false;
        this.cdr.detectChanges(); 
        
        // Ré-initialiser les icônes Lucide après le rendu
        setTimeout(() => {
          if ((window as any).lucide) (window as any).lucide.createIcons();
        }, 100);
      },
      error: (err: any) => {
        console.error('Erreur:', err);
        this.isLoading = false;
      },
    });
  }

  verifierAlertes() {
    const alerts: any[] = [];
    
    this.mesures.forEach(m => {
      const isOff = this.isOffline(m.dateMesure);
      const isLow = m.pourcentage <= 20;

      if (isLow || isOff) {
        alerts.push({
          nom: m.citerne.nom,
          depot: m.citerne.depot ? m.citerne.depot.nom : 'Sans dépôt',
          pourcentage: m.pourcentage,
          type: isOff ? 'SIGNAL PERDU' : 'VIDE'
        });
      }
    });
    
    this.alertesCiternes = alerts;
  }

  hasTempAlert(): boolean {
    return this.groupedDepots.some(g => g.depot && g.depot.alerteTemp);
  }

  getDepotsWithAlert(): Depot[] {
    return this.groupedDepots
      .filter(g => g.depot && g.depot.alerteTemp)
      .map(g => g.depot!);
  }

  dismissAlertes() {
    this.alertesVisible = false;
    // Rétablir les alertes au prochain rafraîchissement
    setTimeout(() => {
      this.alertesVisible = true;
    }, 60000); // Réafficher après 1 minute
  }

  setFiltre(type: string) {
    this.filtreActuel = type;
    this.appliquerFiltre();
  }

  appliquerFiltre() {
    this.filteredGroupedDepots = this.groupedDepots.filter(g => this.shouldShowGroup(g));
  }

  // --- NOUVELLES MÉTHODES ---

  toggleDepot(id?: number) {
    if (!id) return;
    if (this.collapsedDepots.has(id)) {
      this.collapsedDepots.delete(id);
    } else {
      this.collapsedDepots.add(id);
    }
    this.cdr.detectChanges();
  }

  isCollapsed(id?: number): boolean {
    return id ? this.collapsedDepots.has(id) : false;
  }

  moveDepot(index: number, direction: number) {
    const list = this.groupedDepots.filter(g => g.depot);
    const targetIndex = index + direction;
    
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const current = list[index].depot!;
    const target = list[targetIndex].depot!;

    // Échange des ordres
    const tempOrdre = current.ordre || 0;
    current.ordre = target.ordre || 0;
    target.ordre = tempOrdre;

    // Sauvegarde en base (pour les deux)
    forkJoin([
      this.surveillanceService.saveDepot(current),
      this.surveillanceService.saveDepot(target)
    ]).subscribe(() => this.chargerDonnees());
  }

  openAddModal() {
    const nextIndex = this.groupedDepots.length;
    this.newDepot = { 
      nom: '', 
      localisation: '', 
      produit: 'Gasoil', 
      ordre: nextIndex,
      posX: (nextIndex % 2) * 420,
      posY: Math.floor(nextIndex / 2) * 450
    };
    this.isAddingDepot = true;
    this.cdr.detectChanges();
    setTimeout(() => { if ((window as any).lucide) (window as any).lucide.createIcons(); }, 50);
  }

  quickSaveDepot() {
    this.surveillanceService.saveDepot(this.newDepot).subscribe(() => {
      this.isAddingDepot = false;
      this.chargerDonnees();
    });
  }

  onDragEnded(event: any, group: GroupedDepot) {
    const distance = event.distance;
    const SNAP_GRID = 20;

    if (group.depot) {
      let newX = (group.depot.posX || 0) + distance.x;
      let newY = (group.depot.posY || 0) + distance.y;
      
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      
      group.depot.posX = Math.round(newX / SNAP_GRID) * SNAP_GRID;
      group.depot.posY = Math.round(newY / SNAP_GRID) * SNAP_GRID;

      event.source.reset();
      this.hasUnsavedChanges = true;
      this.cdr.detectChanges();
    } else {
      let newX = this.posIndepX + distance.x;
      let newY = this.posIndepY + distance.y;
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      this.posIndepX = Math.round(newX / SNAP_GRID) * SNAP_GRID;
      this.posIndepY = Math.round(newY / SNAP_GRID) * SNAP_GRID;
      event.source.reset();
      localStorage.setItem('sttgo_indep_x', this.posIndepX.toString());
      localStorage.setItem('sttgo_indep_y', this.posIndepY.toString());
      this.cdr.detectChanges();
    }
  }

  saveLayout() {
    if (!this.auth.isAdmin()) return;
    
    this.isLoading = true;
    const saveObservables = this.groupedDepots
      .filter(g => g.depot != null)
      .map(g => this.surveillanceService.saveDepot(g.depot));

    if (saveObservables.length === 0) {
      this.isLoading = false;
      return;
    }

    forkJoin(saveObservables).subscribe({
      next: () => {
        this.isLoading = false;
        this.hasUnsavedChanges = false;
        alert("Carte sauvegardée avec succès !");
        this.chargerDonnees();
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error("Erreur sauvegarde carte", err);
        alert("Erreur lors de la sauvegarde.");
      }
    });

    // Sauver aussi les indépendants
    localStorage.setItem('sttgo_indep_w', this.posIndepWidth.toString());
    localStorage.setItem('sttgo_indep_h', this.posIndepHeight.toString());
  }

  // Plus besoin de onResizeEnded, le ResizeObserver s'en occupe

  // Helper pour savoir si un groupe doit être affiché selon le filtre produit
  shouldShowGroup(group: GroupedDepot): boolean {
    if (this.filtreActuel === 'TOUT') return true;
    
    // Si le dépôt a lui-même un produit défini
    if (group.depot && group.depot.produit === this.filtreActuel) return true;

    // Sinon, regarder si au moins une citerne dans ce dépôt correspond au produit
    return group.mesures.some(m => m.citerne.produit === this.filtreActuel);
  }

  getFilteredMesures(group: GroupedDepot): Mesure[] {
    if (this.filtreActuel === 'TOUT') return group.mesures;
    return group.mesures.filter(m => m.citerne.produit === this.filtreActuel);
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

  /**
   * isOffline : Vérifie si la citerne n'a pas envoyé de données depuis trop longtemps.
   * Seuil par défaut : 12 heures (pour correspondre aux 3 relèves par jour).
   */
  isOffline(dateStr: string | undefined): boolean {
    if (!dateStr) return true;
    const lastSeen = new Date(dateStr).getTime();
    const now = new Date().getTime();
    
    // Calcul de la différence en heures
    const diffInHours = (now - lastSeen) / (1000 * 60 * 60);
    
    return diffInHours > 12; // Retourne vrai si plus de 12h d'inactivité
  }

  trackByDepot(index: number, group: GroupedDepot): any {
    return group.depot ? group.depot.id : 'independent';
  }

  trackByMesure(index: number, mesure: Mesure): any {
    return mesure.citerne.id;
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.resizeSubject.complete();
  }
}