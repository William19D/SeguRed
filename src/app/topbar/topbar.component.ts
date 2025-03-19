import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; // Importar Router

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule], // IMPORTAR CommonModule PARA USAR ngClass
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent {
  isNavbarHidden = false;
  lastScrollTop = 0;

  constructor(private router: Router) {} // Inyectar Router

  @HostListener('window:scroll', [])
  onScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > this.lastScrollTop) {
      this.isNavbarHidden = true; // Ocultar navbar al bajar
    } else {
      this.isNavbarHidden = false; // Mostrar navbar al subir
    }

    this.lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // Evitar valores negativos
  }

  // Método para redirigir al inicio
  goToHome() {
    this.router.navigate(['/']);
  }
}
