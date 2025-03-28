import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
  standalone: true,
  imports: [FormsModule] 
})
export class FooterComponent {
  email: string = '';
  loading: boolean = false;

  constructor(private apiService: ApiService) {}

  subscribe() {
    if (!this.email) {
      alert('Por favor, ingresa tu correo electrónico.');
      return;
    }

    this.loading = true;
    this.apiService.enviarCorreo(this.email).subscribe({
      next: (response) => {
        alert(response);
        this.email = '';
        this.loading = false;
      },
      error: (error) => {
        console.error('Error enviando correo:', error);
        alert('Error enviando el correo.');
        this.loading = false;
      }
    });
  }
}
