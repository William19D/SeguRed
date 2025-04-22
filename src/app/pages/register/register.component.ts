import { Component, AfterViewInit, OnInit } from '@angular/core';
import { NgIf, NgForOf } from '@angular/common'; // Asegúrate de importar NgForOf
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../shared/components/topbar/general/topbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/authentication.service';
import { LocationService } from '../../core/services/location.service';
import { NominatimService } from '../../core/services/nominatim.service';
import { ColombiaApiService } from '../../core/services/colombia-api.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [TopbarComponent, FooterComponent, FormsModule, NgIf, NgForOf], // Incluye NgForOf aquí
})
export class RegisterComponent implements AfterViewInit, OnInit {
  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService,
    private locationService: LocationService,
    private nominatimService: NominatimService,
    private colombiaApiService: ColombiaApiService
  ) {} // Inyectar Router en el constructor

  isLoading: boolean = false; // Variable para controlar el estado de carga de animación

  user = {
    name: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    department: '',
    address: '',
    useLocation: false,
    documentType: 'CC',
    documentNumber: '',
    birthdate: '',
    locations: [] as { lat: number; lng: number }[], // 📌 Arreglo para almacenar ubicaciones
  };

  map: L.Map | undefined;
  marker: L.Marker | undefined;
  departments: any[] = [];
  cities: any[] = [];
  selectedDepartmentId: number | null = null;

  minBirthdate: string = '';  // Inicializar con una cadena vacía

  ngOnInit(): void {
    this.loadDepartments();
    this.setMinBirthdate();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    // Establecer las coordenadas iniciales a Bogotá, Colombia
    this.map = L.map('map').setView([4.7110, -74.0721], 16); // Aumentar el nivel de zoom inicial a 16

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);

    this.marker = L.marker([4.7110, -74.0721], { draggable: true }).addTo(this.map)
      .bindPopup('Arrastra el marcador para actualizar la dirección.')
      .openPopup();

    this.marker.on('dragend', () => {
      const position = this.marker!.getLatLng();
      this.user.locations = [{ lat: position.lat, lng: position.lng }];
      this.updateAddress(position.lat, position.lng);
    });
  }

  private setMinBirthdate(): void {
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate());
    this.minBirthdate = minDate.toISOString().split('T')[0];
  }

  onUseLocationChange() {
    if (this.user.useLocation) {
      this.locationService
        .getCurrentLocation()
        .then((lngLat) => {
          this.user.locations = [{ lat: lngLat.lat, lng: lngLat.lng }];
          if (this.map && this.marker) {
            this.map.setView([lngLat.lat, lngLat.lng], 16); // Actualizar el nivel de zoom del mapa a 16
            this.marker.setLatLng([lngLat.lat, lngLat.lng]);
          }
          this.updateAddress(lngLat.lat, lngLat.lng);
        })
        .catch((error) => {
          console.error('Error getting location', error);
        });
    }
  }

  private updateAddress(lat: number, lng: number): void {
    this.nominatimService.reverseGeocode(lat, lng).subscribe(
      (response) => {
        if (response && response.display_name) {
          this.user.address = this.extractPartialAddress(response.display_name);
          this.user.city = this.extractCityFromAddress(response.address);
          this.user.department = this.extractDepartmentFromAddress(response.address);
          this.loadCities(this.user.department);
        } else {
          this.user.address = `${lat}, ${lng}`; // Fallback en caso de error
        }
      },
      (error) => {
        console.error('Error getting address', error);
        this.user.address = `${lat}, ${lng}`; // Fallback en caso de error
      }
    );
  }

  private extractPartialAddress(fullAddress: string): string {
    const parts = fullAddress.split(',');
    return parts.slice(0, 2).join(','); // Obtener solo hasta la segunda coma
  }

  private extractCityFromAddress(address: any): string {
    if (address.city) {
      return address.city;
    }
    if (address.town) {
      return address.town;
    }
    if (address.village) {
      return address.village;
    }
    if (address.hamlet) {
      return address.hamlet;
    }
    return '';
  }

  private extractDepartmentFromAddress(address: any): string {
    if (address.state) {
      return address.state;
    }
    if (address.county) {
      return address.county;
    }
    return '';
  }

  private loadDepartments(): void {
    this.colombiaApiService.getDepartments().subscribe(
      (data) => {
        this.departments = data;
      },
      (error) => {
        console.error('Error loading departments', error);
      }
    );
  }

  private loadCities(departmentName: string): void {
    const department = this.departments.find(d => d.name === departmentName);
    if (department) {
      this.selectedDepartmentId = department.id;
      this.colombiaApiService.getCitiesByDepartment(department.id).subscribe(
        (data) => {
          this.cities = data;
        },
        (error) => {
          console.error('Error loading cities', error);
        }
      );
    }
  }

  onDepartmentChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedDepartment = selectElement.value;
    this.user.department = selectedDepartment;
    this.loadCities(selectedDepartment);
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

    this.isLoading = true; // Mostrar el indicador de carga

    this.apiService.registerUser(payload).subscribe(
      (response: any) => {
        // Especificar el tipo 'any' para response
        console.log('Registro exitoso', response);
        this.sendVerificationEmail(this.user.email); // Enviar el correo de verificación
      },
      (error: any) => {
        // Especificar el tipo 'any' para error
        console.log('Error al registrar', error);
        this.isLoading = false; // Ocultar el indicador de carga en caso de error
      }
    );
  }

  sendVerificationEmail(email: string) {
    this.authService.sendVerificationCode(email).subscribe(
      (response: any) => {
        console.log('Correo de verificación enviado', response);
        console.log(`Redirigiendo a /verification-code/${encodeURIComponent(email)}`);

        // Un timeout para dejar el paso a la animación de carga
        setTimeout(() => {
          this.isLoading = false;
          this.router.navigate([`/verification-code/${encodeURIComponent(email)}`]);
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