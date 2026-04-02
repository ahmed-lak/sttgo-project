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

@NgModule({
  declarations: [App, Dashboard, LoginComponent, Historique, GestionCiternes],
  imports: [BrowserModule, AppRoutingModule, CommonModule, HttpClientModule, FormsModule],
  providers: [provideBrowserGlobalErrorListeners()],
  bootstrap: [App],
})
export class AppModule {}
