import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/authentication.service';
import { UsuarioService, ActualizacionCuentaDTO } from '../../core/services/usuario.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HttpErrorResponse } from '@angular/common/http';
import * as L from 'leaflet';
import { NominatimService } from '../../core/services/nominatim.service';
import { LocationService } from '../../core/services/location.service';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FooterComponent],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.css']
})
export class EditProfileComponent implements OnInit, AfterViewInit {
  profileForm!: FormGroup;
  isLoading: boolean = false;
  error: string | null = null;
  success: string | null = null;
  
  // Variables para el mapa
  map: L.Map | undefined;
  marker: L.Marker | undefined;
  userLocation: {lat: number, lng: number} = {lat: 4.7110, lng: -74.0721}; // Coordenadas por defecto (Bogotá)

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private nominatimService: NominatimService,
    private locationService: LocationService
  ) {}

  ngOnInit(): void {
    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.initForm();
    this.loadUserData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap(); // Inicializar mapa después de que la vista esté lista
    }, 100);
  }

  initForm(): void {
    this.profileForm = this.fb.group({
      nombreCom: ['', [Validators.required, Validators.minLength(3)]],
      ciudadResidencia: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      direccion: ['', [Validators.required, Validators.minLength(5)]],
      correo: [{ value: '', disabled: true }],
      useLocation: [false],
      locations: [[]] // Añadimos campo para almacenar coordenadas
    });
  }

  loadUserData(): void {
    this.isLoading = true;

    this.authService.getUserInfo().subscribe({
      next: (userData) => {
        // Actualizar el formulario con los datos del usuario
        this.profileForm.patchValue({
          nombreCom: userData.nombreCom || '',
          ciudadResidencia: userData.ciudadResidencia || '',
          telefono: userData.telefono || '',
          direccion: userData.direccion || '',
          correo: userData.correo || userData.email || '',
        });
        
        // Si el usuario tiene coordenadas guardadas, actualizamos el mapa
        if (userData.locations && userData.locations.length > 0) {
          const location = userData.locations[0];
          this.userLocation = {
            lat: location.lat,
            lng: location.lng
          };
          
          // Actualizar el mapa si ya está inicializado
          if (this.map && this.marker) {
            this.map.setView([location.lat, location.lng], 16);
            this.marker.setLatLng([location.lat, location.lng]);
          }
        }
        
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  private initMap(): void {
    // Inicializar el mapa con las coordenadas del usuario o las predeterminadas
    this.map = L.map('map').setView([this.userLocation.lat, this.userLocation.lng], 16);
    
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);

    this.marker = L.marker([this.userLocation.lat, this.userLocation.lng], { draggable: true }).addTo(this.map)
      .bindPopup('Arrastra el marcador para actualizar la dirección.')
      .openPopup();

    this.marker.on('dragend', () => {
      const position = this.marker!.getLatLng();
      this.profileForm.patchValue({
        locations: [{ lat: position.lat, lng: position.lng }]
      });
      this.updateAddress(position.lat, position.lng);
    });
  }

  onUseLocationChange(): void {
    const useLocation = this.profileForm.get('useLocation')?.value;
    
    if (useLocation) {
      this.locationService
        .getCurrentLocation()
        .then((lngLat) => {
          this.profileForm.patchValue({
            locations: [{ lat: lngLat.lat, lng: lngLat.lng }]
          });
          
          if (this.map && this.marker) {
            this.map.setView([lngLat.lat, lngLat.lng], 16);
            this.marker.setLatLng([lngLat.lat, lngLat.lng]);
          }
          this.updateAddress(lngLat.lat, lngLat.lng);
        })
        .catch((error) => {
          console.error('Error getting location', error);
          this.error = 'No se pudo obtener tu ubicación. Por favor, permite el acceso a tu ubicación.';
        });
    }
  }

  private updateAddress(lat: number, lng: number): void {
    this.nominatimService.reverseGeocode(lat, lng).subscribe(
      (response) => {
        if (response && response.display_name) {
          const address = this.extractPartialAddress(response.display_name);
          const city = this.extractCityFromAddress(response.address);
          
          this.profileForm.patchValue({
            direccion: address,
            ciudadResidencia: city || this.profileForm.get('ciudadResidencia')?.value
          });
          
          // Marcar los campos como sucios para que se detecten los cambios
          this.profileForm.get('direccion')?.markAsDirty();
          if (city) {
            this.profileForm.get('ciudadResidencia')?.markAsDirty();
          }
        } else {
          this.profileForm.patchValue({
            direccion: `${lat}, ${lng}` // Fallback en caso de error
          });
          this.profileForm.get('direccion')?.markAsDirty();
        }
      },
      (error) => {
        console.error('Error getting address', error);
        this.profileForm.patchValue({
          direccion: `${lat}, ${lng}` // Fallback en caso de error
        });
        this.profileForm.get('direccion')?.markAsDirty();
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

  onSubmit(): void {
    if (this.profileForm.invalid) {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.profileForm.controls).forEach(key => {
        const control = this.profileForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.success = null;

    // Obtener solo los campos que han cambiado
    const formValue = this.profileForm.getRawValue();
    const actualizacionData: ActualizacionCuentaDTO = {};
    
    if (this.profileForm.get('nombreCom')?.dirty) {
      actualizacionData.nombreCom = formValue.nombreCom;
    }
    if (this.profileForm.get('ciudadResidencia')?.dirty) {
      actualizacionData.ciudadResidencia = formValue.ciudadResidencia;
    }
    if (this.profileForm.get('telefono')?.dirty) {
      actualizacionData.telefono = formValue.telefono;
    }
    if (this.profileForm.get('direccion')?.dirty) {
      actualizacionData.direccion = formValue.direccion;
    }
    
    // Si hay nuevas coordenadas de ubicación, incluirlas usando el formato esperado por el backend
    if (formValue.locations && formValue.locations.length > 0) {
      // El backend espera un único objeto "location" con lat y lng
      actualizacionData.location = {
        lat: formValue.locations[0].lat,
        lng: formValue.locations[0].lng
      };
    }

    // Si no hay cambios, mostrar mensaje y no hacer la petición
    if (Object.keys(actualizacionData).length === 0) {
      this.success = 'No se han detectado cambios en la información';
      this.isLoading = false;
      return;
    }

    console.log('Enviando actualización:', actualizacionData);

    // Enviar solicitud para actualizar datos
    this.usuarioService.actualizarCuenta(actualizacionData).subscribe({
      next: (response) => {
        this.success = 'Perfil actualizado correctamente';
        this.isLoading = false;
        
        // Actualizar datos en el localStorage a través del servicio de autenticación
        this.authService.getUserInfo().subscribe();
        
        // Resetear estado de formulario modificado
        this.profileForm.markAsPristine();
      },
      error: (error) => {
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  handleError(error: HttpErrorResponse): void {
    if (error.status === 401) {
      this.error = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      setTimeout(() => {
        this.authService.logout();
        this.router.navigate(['/login']);
      }, 2000);
    } else {
      this.error = error.error?.error || 'Ocurrió un error al actualizar el perfil. Inténtalo nuevamente.';
    }
    console.error('Error:', error);
  }

  cancel(): void {
    this.router.navigate(['/profile']);
  }
}