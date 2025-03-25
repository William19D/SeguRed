import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-recover-password',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent, FooterComponent],
  templateUrl: './recover-password.component.html',
  styleUrls: ['./recover-password.component.css']
})
export class RecoverPasswordComponent {
  email: string = '';
  apiUrl = 'https://api.example.com/recover-password'; // Cambiar por la API real

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit() {
    if (!this.email.trim()) {
      alert('Por favor, ingresa un correo válido.');
      return;
    }

    this.http.post(this.apiUrl, { email: this.email }).subscribe({
      next: (response) => {
        console.log('Respuesta de la API:', response);
        alert('Se ha enviado un enlace de recuperación a tu correo.');
        this.router.navigate(['/login']); // Redirige al login tras el envío
      },
      error: (error) => {
        console.error('Error en la recuperación:', error);
        alert('Ocurrió un error al enviar el correo. Inténtalo de nuevo.');
      }
    });
  }
  goToLogin() {
    this.router.navigate(['/login']);
  }
}
