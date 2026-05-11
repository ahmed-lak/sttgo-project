import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { FormsModule } from '@angular/forms';
import { Dashboard } from './components/dashboard/dashboard';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { LoginComponent } from './components/login/login';
import { Historique } from './components/historique/historique';
import { GestionCiternes } from './components/gestion-citernes/gestion-citernes';
import { GestionDepots } from './components/gestion-depots/gestion-depots';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { VueDepot } from './components/vue-depot/vue-depot';
import { GestionUtilisateurs } from './components/gestion-utilisateurs/gestion-utilisateurs';

@NgModule({
  declarations: [App, Dashboard, LoginComponent, Historique, GestionCiternes, GestionDepots, VueDepot, GestionUtilisateurs],
  imports: [BrowserModule, AppRoutingModule, CommonModule, HttpClientModule, FormsModule, DragDropModule],
  providers: [provideBrowserGlobalErrorListeners()],
  bootstrap: [App],
})
export class AppModule {}
