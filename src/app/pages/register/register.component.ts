import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [TopbarComponent, FooterComponent, FormsModule]
})
export class RegisterComponent {
  constructor(private router: Router, private apiService: ApiService) {} 

  user = {
    name: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    address: '',
    useLocation: false,
    documentType: 'CC',
    documentNumber: '',
    birthdate: ''
  };

  obtenerUbicacion() {
    if (this.user.useLocation) { 
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            this.user.address = `Lat: ${lat}, Lon: ${lon}`;
            console.log(`Ubicación obtenida: ${this.user.address}`);
          },
          (error) => {
            console.error("Error al obtener ubicación:", error.message);
          }
        );
      } else {
        console.log("Geolocalización no soportada en este navegador.");
      }
    } else {
      this.user.address = '';
    }
  }

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
      estado: 'En espera',
      correo: this.user.email,
      preferencias: '',
      contraseña: this.user.password 
    }

    this.apiService.registerUser(payload).subscribe(
      (response) => {
        console.log('Registro exitoso', response);
      },
      (error) => {
        console.log('Error al registrar', error);
      }
    );
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
