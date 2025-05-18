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
  isMenuOpen = false; // Controla si el menú de hamburguesa está abierto

  constructor(private router: Router) {
    // Detectar cambios en la navegación para resetear el scroll
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        window.scrollTo(0, 0); // Mueve la vista al inicio al cambiar de página
        this.closeMenu(); // Cierra el menú al cambiar de página
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

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen; // Alterna el estado del menú
    
    // Opcional: Controlar el scroll del body cuando el menú está abierto
    if (this.isMenuOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
  }

  // Método para cerrar el menú - añadido para resolver el error
  closeMenu() {
    if (this.isMenuOpen) {
      this.isMenuOpen = false;
      document.body.classList.remove('no-scroll');
    }
  }

  goToHome() {
    this.router.navigate(['/']);
    this.closeMenu(); // Cerrar el menú al navegar
  }

  goToRegister() {
    this.router.navigate(['/register']);
    this.closeMenu(); // Cerrar el menú al navegar
  }

  goToLogin() {
    this.router.navigate(['/login']);
    this.closeMenu(); // Cerrar el menú al navegar
  }
}