import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UsertopbarComponent } from '../../shared/components/topbar/user/usertopbar/usertopbar.component';
import { AuthService } from '../../core/services/authentication.service';
import { HttpErrorResponse } from '@angular/common/http';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule , FooterComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  isLoading: boolean = true;
  error: string | null = null;

  user = {
    name: 'Usuario',
    profilePicture: 'assets/default-profile.png', // Imagen por defecto
    fullName: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    documentNumber: '',
    birthDate: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

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
      name: userData.nombreCom?.split(' ')[0] || 'Usuario', // Primer nombre
      profilePicture: userData.profilePicture || 'default-profile.png', // Imagen de perfil o por defecto
      fullName: userData.nombreCom || '',
      email: userData.email || userData.correo || '',
      phone: userData.telefono || '',
      city: userData.ciudadResidencia || '',
      address: userData.direccion || '',
      documentNumber: userData.documento || '',
      birthDate: this.formatDate(userData.fechaNacimiento)
    };
  }

  handleError(error: HttpErrorResponse): void {
    if (error.status === 401) {
      this.error = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      setTimeout(() => {
        this.authService.logout();
      }, 2000);
    } else {
      this.error = 'No se pudo cargar la información del perfil. Por favor, intenta nuevamente.';
    }
    console.error('Error al cargar el perfil:', error);
  }

  editarPerfil(): void {
    this.router.navigate(['/edit-profile']);
  }

  eliminarCuenta(): void {
    // Implementar lógica para eliminar cuenta
    console.log('Eliminando cuenta...');
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}/${
        (date.getMonth() + 1).toString().padStart(2, '0')}/${
        date.getFullYear()}`;
    } catch (e) {
      return dateString;
    }
  }
}