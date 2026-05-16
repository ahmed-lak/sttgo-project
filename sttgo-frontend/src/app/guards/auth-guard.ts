import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) { }

  canActivate(): boolean {
    const credentials = sessionStorage.getItem('credentials');
    if (credentials) {
      return true;
    } else {
      this.router.navigate(['/login'], { replaceUrl: true });
      return false;
    }
  }
}
