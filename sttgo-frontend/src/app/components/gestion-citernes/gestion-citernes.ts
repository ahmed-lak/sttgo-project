import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // 1. Ajout de l'import
import { SurveillanceService } from '../../Services/surveillance';
import { Router } from '@angular/router';

@Component({
  selector: 'app-gestion-citernes',
  standalone: false,
  templateUrl: './gestion-citernes.html',
  styleUrl: './gestion-citernes.css',
})
export class GestionCiternes implements OnInit {
  citernes: any[] = [];
  selectedCiterne: any = {}; 
  isEditMode: boolean = false;
  showModal: boolean = false; 

  // 2. Injection dans le constructor
  constructor(
    private surveillanceService: SurveillanceService, 
    private router: Router,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit(): void {
    this.chargerCiternes();
  }

  chargerCiternes() {
    this.surveillanceService.getCiternes().subscribe({
      next: (data) => {
        this.citernes = data;
        this.cdr.detectChanges(); // 3. On force le rafraîchissement du tableau
      },
      error: (err) => console.error("Erreur de chargement", err)
    });
  }

  prepareNew() {
    this.isEditMode = false;
    this.selectedCiterne = { 
      nom: '', 
      produit: 'Gasoil', 
      type: 'VERTICAL', 
      capaciteMax: 5000, 
      hauteurTotale: 200, 
      diametre: 150, 
      longueur: 0 
    };
    this.showModal = true;
    this.cdr.detectChanges(); // 4. On s'assure que la modal s'affiche bien
  }

  editCiterne(c: any) {
    this.isEditMode = true;
    this.selectedCiterne = { ...c }; 
    this.showModal = true;
    this.cdr.detectChanges(); // 5. On force l'affichage des données dans les inputs
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
    localStorage.removeItem('credentials');
    this.router.navigate(['/login']);
  }
}