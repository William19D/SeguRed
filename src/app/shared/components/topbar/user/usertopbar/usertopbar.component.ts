import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../../core/services/authentication.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-usertopbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './usertopbar.component.html',
  styleUrls: ['./usertopbar.component.css']
})
export class UsertopbarComponent implements OnInit {
  isNavbarHidden = false;
  isUserMenuOpen = false;
  isMobileMenuOpen = false;
  isLoading: boolean = true;
  error: string | null = null;
  lastScrollPosition = 0;

  user = {
    name: 'Usuario', 
    profilePicture: 'default-profile.png',
    role: 'Usuario'
  };

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadUserProfile();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const currentScrollPosition = window.pageYOffset;
    // Ocultar navbar al hacer scroll hacia abajo (solo en móviles)
    if (window.innerWidth <= 768) {
      if (currentScrollPosition > this.lastScrollPosition && currentScrollPosition > 50) {
        this.isNavbarHidden = true;
      } else {
        this.isNavbarHidden = false;
      }
      this.lastScrollPosition = currentScrollPosition;
    }
  }

  @HostListener('window:click', ['$event'])
  onWindowClick(event: MouseEvent): void {
    // Cerrar el menú de usuario si se hace clic fuera de él
    const userInfo = document.querySelector('.user-info');
    const userDropdown = document.querySelector('.user-dropdown');
    
    if (userInfo && userDropdown && 
        !userInfo.contains(event.target as Node) && 
        !userDropdown.contains(event.target as Node)) {
      this.isUserMenuOpen = false;
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    // Cerrar menú móvil si se redimensiona a pantalla grande
    if (window.innerWidth > 768 && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  loadUserProfile(): void {
    this.isLoading = true;
    this.error = null;

    this.authService.getUserInfo().subscribe({
      next: (userData) => {
        this.mapUserData(userData);
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  mapUserData(userData: any): void {
    this.user = {
      name: userData.nombreCom?.split(' ')[0] || 'Usuario',
      profilePicture: userData.profilePicture || 'default-profile.png',
      role: userData.role || 'Usuario'
    };
  }

  handleImageError(event: any): void {
    event.target.src = 'default-profile.png'; 
  }

  handleError(error: HttpErrorResponse): void {
    if (error.status === 401) {
      this.error = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      setTimeout(() => {
        this.authService.logout();
        this.router.navigate(['/login']);
      }, 2000);
    } else {
      this.error = 'No se pudo cargar la información del usuario. Por favor, intenta nuevamente.';
    }
    console.error('Error al cargar el usuario:', error);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
    this.closeMobileMenu();
  }

  goToCreateReport() {
    this.router.navigate(['/create-report']);
    this.closeMobileMenu();
  }

  goToProfile() {
    this.router.navigate(['/profile']);
    this.closeMobileMenu();
    this.isUserMenuOpen = false;
  }

  goToMyReports() {
    this.router.navigate(['/my-reports']);
    this.closeMobileMenu();
    this.isUserMenuOpen = false;
  }

  openNotifications() {
    console.log('Abrir notificaciones');
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    
    // Prevenir scroll del body cuando el menú está abierto
    if (this.isMobileMenuOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
    document.body.classList.remove('no-scroll');
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
    this.closeMobileMenu();
  }
}