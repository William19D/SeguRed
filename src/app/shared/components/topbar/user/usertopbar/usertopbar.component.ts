import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/services/authentication.service'; // Importa el AuthService
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-usertopbar',
  standalone: true, // Componente independiente
  imports: [CommonModule], // Importa CommonModule
  templateUrl: './usertopbar.component.html',
  styleUrls: ['./usertopbar.component.css']
})
export class UsertopbarComponent implements OnInit {
  isNavbarHidden = false;
  isUserMenuOpen = false;
  isLoading: boolean = true;
  error: string | null = null;

  user = {
    name: 'Usuario', 
    profilePicture: 'assets/default-profile.png', // Imagen por defecto
    role: 'Usuario' // Valor predeterminado
  };

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Intentar cargar los datos del usuario
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.isLoading = true;
    this.error = null;

    this.authService.getUserInfo().subscribe({
      next: (userData) => {
        this.mapUserData(userData); // Mapear los datos del usuario
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
      name: userData.nombreCom?.split(' ')[0] || 'Usuario', // Toma el primer nombre
      profilePicture: userData.profilePicture || 'default-profile.png', // Usa la imagen o la predeterminada
      role: userData.role || 'Usuario' // Rol del usuario
    };
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
  }

  goToCreateReport() {
    this.router.navigate(['/create-report']);
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  openNotifications() {
    console.log('Abrir notificaciones');
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  logout() {
    this.authService.logout(); // Lógica para cerrar sesión
    this.router.navigate(['/login']); // Redirigir al login
  }
}