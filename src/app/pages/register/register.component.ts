import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { LocationService } from '../../core/services/location.service'; // Importar el servicio de ubicación


@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [TopbarComponent, FooterComponent, FormsModule]
})
export class RegisterComponent {
  constructor(private router: Router, private apiService: ApiService ,private locationService: LocationService) {} // Inyectar Router en el constructor

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
      this.locationService.getCurrentLocation().then((lngLat) => {
        this.user.address = `${lngLat.lat}, ${lngLat.lng}`;
        this.user.locations.push({ lat: lngLat.lat, lng: lngLat.lng });
      }).catch((error) => {
        console.error('Error getting location', error);
      });
    }
  }  
  register() {
    // Lógica para registrar al usuario
    console.log(this.user);

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
      contraseña: this.user.password,
      locations: this.user.locations              
    };

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
