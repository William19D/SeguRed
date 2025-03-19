import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../topbar/topbar.component';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-register',
  standalone: true, // Especificamos que es un componente independiente
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [FormsModule, FooterComponent] // Importamos FormsModule aquí
 // Importamos FormsModule aquí
 // Importamos FormsModule aquí
})
export class RegisterComponent {
  user = {
    name: '',
    email: '',
    password: ''
  };

  onRegister() {
    console.log("Usuario registrado:", this.user);
    // Aquí puedes agregar lógica para enviar los datos a un backend.
  }
}
