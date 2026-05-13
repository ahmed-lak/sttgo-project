import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Dashboard } from './components/dashboard/dashboard';
import { LoginComponent } from './components/login/login';
import { Historique } from './components/historique/historique';
import { GestionCiternes } from './components/gestion-citernes/gestion-citernes';
import { GestionDepots } from './components/gestion-depots/gestion-depots';
import { VueDepot } from './components/vue-depot/vue-depot';
import { GestionUtilisateurs } from './components/gestion-utilisateurs/gestion-utilisateurs';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: Dashboard },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'historique/:id', component: Historique },
  { path: 'Citernes', component: GestionCiternes },
  { path: 'Depots', component: GestionDepots },
  { path: 'Utilisateurs', component: GestionUtilisateurs },
  { path: 'vue-depot/:id', component: VueDepot },
  { path: 'reset-password', component: LoginComponent },
  { path: 'register', component: LoginComponent }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
