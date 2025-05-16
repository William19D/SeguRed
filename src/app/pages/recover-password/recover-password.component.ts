import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { TopbarComponent } from '../../shared/components/topbar/general/topbar.component';
import { AuthService } from '../../core/services/authentication.service';

@Component({
  selector: 'app-recover-password',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent, FooterComponent],
  templateUrl: './recover-password.component.html',
  styleUrls: ['./recover-password.component.css']
})
export class RecoverPasswordComponent {
  email: string = '';
  loading: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    if (!this.email.trim()) {
      alert('Por favor, ingresa un correo válido.');
      return;
    }

    this.loading = true;
    this.authService.requestPasswordReset(this.email).subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);
        alert('Se ha enviado un código de verificación a tu correo.');
        // Redirigir a la página de verificación de código, pasando el correo
        this.router.navigate(['/password-code-verification', { email: encodeURIComponent(this.email) }]);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error en la recuperación:', error);
        let errorMessage = 'Ocurrió un error al enviar el correo. Inténtalo de nuevo.';
        if (error.error && error.error.error) {
          errorMessage = error.error.error;
        }
        alert(errorMessage);
        this.loading = false;
      }
    });
  }
  
  goToLogin() {
    this.router.navigate(['/login']);
  }
}