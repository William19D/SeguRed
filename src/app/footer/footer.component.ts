import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Importar FormsModule

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
  standalone: true,
  imports: [FormsModule] // Importar FormsModule aquí
})
export class FooterComponent {
  email: string = ''; // Asegúrate de que esta variable está declarada

  subscribe() {
    if (this.email) {
      console.log(`Suscripción exitosa para: ${this.email}`);
      alert(`¡Gracias por suscribirte!`);
      this.email = ''; // Limpiar campo después de suscribirse
    } else {
      alert('Por favor, ingresa tu correo electrónico.');
    }
  }
}
