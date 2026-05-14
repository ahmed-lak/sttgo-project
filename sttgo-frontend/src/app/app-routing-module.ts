import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Dashboard } from './components/dashboard/dashboard';
import { LoginComponent } from './components/login/login';
import { Historique } from './components/historique/historique';
import { GestionCiternes } from './components/gestion-citernes/gestion-citernes';
import { GestionDepots } from './components/gestion-depots/gestion-depots';
import { VueDepot } from './components/vue-depot/vue-depot';
import { GestionUtilisateurs } from './components/gestion-utilisateurs/gestion-utilisateurs';

import { AuthGuard } from './guards/auth-guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: Dashboard, canActivate: [AuthGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'historique/:id', component: Historique, canActivate: [AuthGuard] },
  { path: 'Citernes', component: GestionCiternes, canActivate: [AuthGuard] },
  { path: 'Depots', component: GestionDepots, canActivate: [AuthGuard] },
  { path: 'Utilisateurs', component: GestionUtilisateurs, canActivate: [AuthGuard] },
  { path: 'vue-depot/:id', component: VueDepot, canActivate: [AuthGuard] },
  { path: 'reset-password', component: LoginComponent },
  { path: 'register', component: LoginComponent }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
