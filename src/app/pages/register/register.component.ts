import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true, // Especificamos que es un componente independiente
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [FormsModule, 
            FooterComponent,
            TopbarComponent] // Importamos FormsModule aquí
 // Importamos FormsModule aquí
 // Importamos FormsModule aquí
})
export class RegisterComponent {
  constructor(private router: Router) {} // Inyectar Router en el constructor
  user = {
    name: '',
    email: '',
    password: '',
    phone: '',   // 📌 Agregar teléfono
    city: '',    // 📌 Agregar ciudad de residencia
    address: '', // 📌 Agregar dirección
    useLocation: false, // 📌 Checkbox para ubicación
    documentType: 'CC', // 📌 Tipo de documento con valor por defecto
    documentNumber: '',
    birthdate: ''
  };

  onRegister() {
    console.log('Usuario registrado:', this.user);
    // Aquí puedes manejar la lógica para el registro
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
  
}

