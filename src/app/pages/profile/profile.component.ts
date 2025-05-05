import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UsertopbarComponent } from '../../shared/components/topbar/user/usertopbar/usertopbar.component';
import { AuthService } from '../../core/services/authentication.service';
import { HttpErrorResponse } from '@angular/common/http';
import { FooterComponent } from '../../shared/components/footer/footer.component';

interface UserProfile {
  name?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  city?: string;
  address?: string;
  documentNumber?: string;
  birthDate?: string;
  profilePicture?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, UsertopbarComponent, FooterComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  userProfile: UserProfile = {};
  isLoading: boolean = true;
  error: string | null = null;
  showDeleteConfirmation: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Intentar cargar los datos del usuario si ya están en almacenamiento
    const cachedUser = this.authService.getCurrentUser();
    if (cachedUser) {
      this.mapUserDataToProfile(cachedUser);
    }

    // Independientemente de si tenemos datos en caché o no, obtenemos datos actualizados
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.isLoading = true;
    this.error = null;

    this.authService.getUserInfo().subscribe({
      next: (userData) => {
        this.mapUserDataToProfile(userData);
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  mapUserDataToProfile(userData: any): void {
    // Mapear los datos del backend a nuestro formato de perfil
    this.userProfile = {
      name: userData.nombreCom?.split(' ')[0] || 'Usuario',
      email: userData.email || userData.correo,
      fullName: userData.nombreCom || userData.fullName,
      phone: userData.telefono || userData.phone,
      city: userData.ciudadResidencia || userData.city,
      address: userData.direccion || userData.address,
      documentNumber: userData.documento || userData.documentNumber,
      birthDate: userData.fechaNacimiento || userData.birthDate,
      profilePicture: userData.profilePicture || 'assets/default-profile.png'
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

  confirmarEliminacion(): void {
    this.showDeleteConfirmation = true;
  }

  cancelarEliminacion(): void {
    this.showDeleteConfirmation = false;
  }

  eliminarCuenta(): void {
    this.isLoading = true;
    this.error = null;

    // Llamada al servicio para eliminar la cuenta
    this.authService.deleteAccount().subscribe({
      next: () => {
        alert('Tu cuenta ha sido eliminada correctamente.');
        this.authService.logout(); // Esto redirigirá al login
      },
      error: (error) => {
        this.error = 'No se pudo eliminar la cuenta. Por favor, intenta nuevamente.';
        this.isLoading = false;
        console.error('Error al eliminar cuenta:', error);
      }
    });
  }

  // Método para formatear la fecha si viene en formato diferente
  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    
    // Si la fecha ya está en formato DD/MM/YYYY la devolvemos igual
    if (dateString.includes('/')) return dateString;
    
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