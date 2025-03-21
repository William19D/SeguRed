import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Importa FormsModule

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
  standalone: true,
  imports: [FormsModule] // Asegura que FormsModule esté aquí
})
export class FooterComponent {
  email: string = ''; // Define la variable email

  // Define la función subscribe()
  subscribe() {
    console.log('Correo suscrito:', this.email);
    alert(`¡Gracias por suscribirte con ${this.email}!`);
  }
}
