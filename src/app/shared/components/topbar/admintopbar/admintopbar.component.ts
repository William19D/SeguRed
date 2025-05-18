import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/authentication.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-admin-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admintopbar.component.html',
  styleUrls: ['./admintopbar.component.css']
})
export class AdminTopbarComponent implements OnInit {
  isNavbarHidden = false;
  isUserMenuOpen = false;
  isMobileMenuOpen = false;
  isLoading: boolean = true;
  error: string | null = null;
  lastScrollPosition = 0;
  
  // Contador de pendientes para mostrar en badges
  pendingReportsCount = 0;

  user = {
    name: 'Administrador', 
    profilePicture: 'default-profile.png',
  };

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Verificar si el usuario es administrador
    this.loadUserProfile();
    
    // Cargar contadores de pendientes
    this.loadPendingCounts();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const currentScrollPosition = window.pageYOffset;
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
        
        // Verificar si es administrador
        if (userData.rol !== 'ADMINISTRADOR') {
          this.router.navigate(['/login']);
          this.authService.logout();
        }
        
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }
  
  loadPendingCounts(): void {
    // Aquí se conectaría con un servicio para obtener el número de reportes pendientes
    // Por ahora usamos un valor simulado
    setTimeout(() => {
      this.pendingReportsCount = 5;
    }, 1000);
  }

  mapUserData(userData: any): void {
    this.user = {
      name: userData.nombreCom?.split(' ')[0] || 'Administrador',
      profilePicture: userData.profilePicture || 'default-profile.png',
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

  goToAdminDashboard() {
    this.router.navigate(['/admin/dashboard']);
    this.closeMobileMenu();
  }
  
  goToUserDashboard() {
    this.router.navigate(['/dashboard']);
    this.closeMobileMenu();
  }

  goToUserManagement() {
    this.router.navigate(['/admin/users']);
    this.closeMobileMenu();
  }
  
  goToReportApprovals() {
    this.router.navigate(['/admin/approvals']);
    this.closeMobileMenu();
  }
  
  goToStatistics() {
    this.router.navigate(['/admin/statistics']);
    this.closeMobileMenu();
  }

  goToProfile() {
    this.router.navigate(['/profile']);
    this.closeMobileMenu();
    this.isUserMenuOpen = false;
  }

  goToSettings() {
    this.router.navigate(['/admin/settings']);
    this.closeMobileMenu();
    this.isUserMenuOpen = false;
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    
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