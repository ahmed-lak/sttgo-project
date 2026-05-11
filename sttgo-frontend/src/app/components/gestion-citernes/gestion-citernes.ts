import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // 1. Ajout de l'import
import { SurveillanceService } from '../../Services/surveillance';
import { Router } from '@angular/router';
import { AuthService } from '../../Services/auth';

@Component({
  selector: 'app-gestion-citernes',
  standalone: false,
  templateUrl: './gestion-citernes.html',
  styleUrl: './gestion-citernes.css',
})
export class GestionCiternes implements OnInit {
  citernes: any[] = [];
  depots: any[] = [];
  selectedCiterne: any = {}; 
  isEditMode: boolean = false;
  showModal: boolean = false; 

  // 2. Injection dans le constructor
  constructor(
    private surveillanceService: SurveillanceService, 
    private router: Router,
    private cdr: ChangeDetectorRef,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.chargerCiternes();
    this.chargerDepots();
    setTimeout(() => { if ((window as any).lucide) (window as any).lucide.createIcons(); }, 100);
  }

  chargerCiternes() {
    this.surveillanceService.getCiternes().subscribe({
      next: (data) => {
        this.citernes = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Erreur de chargement", err)
    });
  }

  chargerDepots() {
    this.surveillanceService.getDepots().subscribe({
      next: (data) => {
        this.depots = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Erreur de chargement depots", err)
    });
  }

  prepareNew() {
    this.isEditMode = false;
    this.selectedCiterne = { 
      id: null,
      nom: '', 
      produit: 'Gasoil', 
      type: 'VERTICAL', 
      capaciteMax: 5000, 
      hauteurTotale: 200, 
      diametre: 150, 
      longueur: 0,
      depot: null
    };
    this.showModal = true;
    this.cdr.detectChanges(); // 4. On s'assure que la modal s'affiche bien
    setTimeout(() => { if ((window as any).lucide) (window as any).lucide.createIcons(); }, 50);
  }

  editCiterne(c: any) {
    this.isEditMode = true;
    this.selectedCiterne = { ...c }; 
    this.showModal = true;
    this.cdr.detectChanges(); // 5. On force l'affichage des données dans les inputs
    setTimeout(() => { if ((window as any).lucide) (window as any).lucide.createIcons(); }, 50);
  }

  saveCiterne() {
    this.surveillanceService.saveCiterne(this.selectedCiterne).subscribe({
      next: () => {
        this.chargerCiternes(); 
        this.showModal = false; 
        this.cdr.detectChanges(); // 6. On confirme la fermeture et le refresh
      },
      error: (err) => alert("Erreur lors de l'enregistrement")
    });
  }

  calculerCapacite() {
    if (!this.selectedCiterne.diametre) return;

    const r = this.selectedCiterne.diametre / 2; // Rayon en cm
    
    // Logique intelligente : on prend la dimension disponible
    let longueurUtile = 0;
    if (this.selectedCiterne.type === 'HORIZONTAL') {
      // Pour une horizontale, on utilise la longueur, ou la hauteur si la longueur est vide
      longueurUtile = this.selectedCiterne.longueur || this.selectedCiterne.hauteurTotale || 0;
    } else {
      // Pour une verticale, on utilise la hauteur
      longueurUtile = this.selectedCiterne.hauteurTotale || 0;
    }

    // Formule Cylindre : V = PI * r² * L (en cm³)
    const volumeCm3 = Math.PI * Math.pow(r, 2) * longueurUtile;
    const volumeLitre = volumeCm3 / 1000;

    this.selectedCiterne.capaciteMax = Math.round(volumeLitre);
    this.cdr.detectChanges();
  }

  deleteCiterne(id: number) {
    if(confirm("Supprimer définitivement cette citerne ?")) {
      this.surveillanceService.deleteCiterne(id).subscribe({
        next: () => {
          this.chargerCiternes();
          this.cdr.detectChanges();
        },
        error: (err) => alert("Impossible de supprimer : vérifiez s'il reste des mesures liées.")
      });
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}