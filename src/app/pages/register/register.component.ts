import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

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
  constructor(private router: Router, private apiService: ApiService) {} // Inyectar Router en el constructor
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
    const payload = {
      tpDocumento: this.user.documentType,      
      documento: this.user.documentNumber,        
      nombreCom: this.user.name,                  
      fechaNacimiento: this.user.birthdate,      
      ciudadResidencia: this.user.city,          
      direccion: this.user.address,             
      telefono: this.user.phone,                 
      cargo: '',                                 
      estado: 'Rechazado',                        
      correo: this.user.email,                   
      preferencias: '',                           
      contraseña: this.user.password 
    }

    this.apiService.registerUser(payload).subscribe(
      (response) => {
        console.log('Registro exitoso', response);
      },
      (error) => {
        console.log('Error al registrar',error);
      }
    );
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
  
}

