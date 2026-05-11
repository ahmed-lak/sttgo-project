import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { SurveillanceService } from '../../Services/surveillance';
import { AuthService } from '../../Services/auth';
import { Depot } from '../../models/Depot';

@Component({
  selector: 'app-gestion-depots',
  standalone: false,
  templateUrl: './gestion-depots.html',
  styleUrls: ['./gestion-depots.css']
})
export class GestionDepots implements OnInit {
  depots: Depot[] = [];
  showModal = false;
  isEditMode = false;
  selectedDepot: Depot = { nom: '', localisation: '', produit: '' };

  constructor(
    private surveillanceService: SurveillanceService,
    public auth: AuthService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadDepots();
    setTimeout(() => { if ((window as any).lucide) (window as any).lucide.createIcons(); }, 100);
  }

  loadDepots() {
    this.surveillanceService.getDepots().subscribe(data => {
      this.depots = data;
      this.cdr.detectChanges();
    });
  }

  prepareNew() {
    this.isEditMode = false;
    this.selectedDepot = { nom: '', localisation: '', produit: 'Gasoil' };
    this.showModal = true;
    this.cdr.detectChanges();
    setTimeout(() => { if ((window as any).lucide) (window as any).lucide.createIcons(); }, 50);
  }

  editDepot(d: Depot) {
    this.isEditMode = true;
    this.selectedDepot = { ...d };
    this.showModal = true;
    this.cdr.detectChanges();
    setTimeout(() => { if ((window as any).lucide) (window as any).lucide.createIcons(); }, 50);
  }

  saveDepot() {
    this.surveillanceService.saveDepot(this.selectedDepot).subscribe(() => {
      this.showModal = false;
      this.loadDepots();
    });
  }

  deleteDepot(id?: number) {
    if (id && confirm("Êtes-vous sûr de vouloir supprimer ce dépôt ?")) {
      this.surveillanceService.deleteDepot(id).subscribe(() => {
        this.loadDepots();
      });
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
