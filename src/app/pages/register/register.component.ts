import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/authentication.service';
import { LocationService } from '../../core/services/location.service';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [TopbarComponent, FooterComponent, FormsModule, NgIf],
})
export class RegisterComponent {
  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService,
    private locationService: LocationService
  ) {} // Inyectar Router en el constructor

  isLoading: boolean=false; // Variable para controlar el estado de carga de animación

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
    birthdate: '',
    locations: [] as { lat: number; lng: number }[], // 📌 Arreglo para almacenar ubicaciones
  };

  onUseLocationChange() {
    if (this.user.useLocation) {
      this.locationService
        .getCurrentLocation()
        .then((lngLat) => {
          this.user.address = `${lngLat.lat}, ${lngLat.lng}`;
          this.user.locations.push({ lat: lngLat.lat, lng: lngLat.lng });
        })
        .catch((error) => {
          console.error('Error getting location', error);
        });
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
      estado: 'EN_ESPERA',
      correo: this.user.email,
      preferencias: '',
      contraseña: this.user.password,
      locations: this.user.locations,
    };

    this.apiService.registerUser(payload).subscribe(
      (response: any) => {
        // Especificar el tipo 'any' para response
        console.log('Registro exitoso', response);
        this.sendVerificationEmail(this.user.email); // Enviar el correo de verificación
      },
      (error: any) => {
        // Especificar el tipo 'any' para error
        console.log('Error al registrar', error);
      }
    );
  }

  sendVerificationEmail(email: string) {
    this.isLoading = true; // Activar la animación de carga
    
    this.authService.sendVerificationCode(email).subscribe(
      (response: any) => {
        console.log('Correo de verificación enviado', response);
        console.log(
          `Redirigiendo a /verification-code/${encodeURIComponent(email)}`
        );
        
        // Un timeout para dejar el paso a la anim
        setTimeout(() => {
          this.isLoading = false;
          this.router.navigate([
            `/verification-code/${encodeURIComponent(email)}`,
          ]);
        }, 1000);
      },
      (error: any) => {
        this.isLoading = false; // Desactivar la animación de carga si hay algún error
        console.log('Error al enviar el correo de verificación', error);
      }
    );
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}