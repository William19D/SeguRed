import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, Event, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent {
  isNavbarHidden = false;
  lastScrollTop = 0;

  constructor(private router: Router) {
    // Detectar cambios en la navegación para resetear el scroll
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        window.scrollTo(0, 0); // Mueve la vista al inicio al cambiar de página
      }
    });
  }

  @HostListener('window:scroll', [])
  onScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > this.lastScrollTop) {
      this.isNavbarHidden = true; // Oculta la navbar al hacer scroll hacia abajo
    } else {
      this.isNavbarHidden = false; // Muestra la navbar al hacer scroll hacia arriba
    }

    this.lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
