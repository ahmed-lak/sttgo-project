import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Dashboard } from './components/dashboard/dashboard';
import { LoginComponent } from './components/login/login';
import { Historique } from './components/historique/historique';
import { GestionCiternes } from './components/gestion-citernes/gestion-citernes';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: Dashboard },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'historique/:id', component: Historique },
    { path: 'Citernes', component: GestionCiternes }

];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
