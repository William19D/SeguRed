import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { TopbarComponent } from '../../shared/components/topbar/general/topbar.component';
import { AuthService } from '../../core/services/authentication.service';

@Component({
  selector: 'app-password-code-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent, FooterComponent],
  templateUrl: './password-code-verification.component.html',
  styleUrls: ['./password-code-verification.component.css']
})
export class PasswordCodeVerificationComponent implements OnInit {
  email: string = '';
  code: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  loading: boolean = false;
  codeVerified: boolean = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Obtener el email de los parámetros de la ruta
    const emailParam = this.route.snapshot.paramMap.get('email');
    this.email = emailParam ? decodeURIComponent(emailParam) : '';
    
    if (!this.email) {
      alert('No se ha proporcionado un correo electrónico válido.');
      this.router.navigate(['/recover-password']);
    }
  }

  verifyCode(): void {
    if (!this.code.trim()) {
      alert('Por favor, ingresa el código de verificación.');
      return;
    }

    // Solo verificamos si el código es válido para mostrar el formulario de cambio de contraseña
    this.codeVerified = true;
  }

  resetPassword(): void {
    if (!this.newPassword) {
      alert('Por favor, ingresa una nueva contraseña.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    this.loading = true;
    this.authService.resetPasswordWithCode(this.email, this.code, this.newPassword).subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);
        alert('Contraseña actualizada correctamente.');
        this.router.navigate(['/login']);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al restablecer la contraseña:', error);
        let errorMessage = 'Ocurrió un error al cambiar la contraseña. Inténtalo de nuevo.';
        if (error.error && error.error.error) {
          errorMessage = error.error.error;
        }
        alert(errorMessage);
        this.loading = false;
      }
    });
  }
}