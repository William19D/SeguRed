import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { LocationService } from '../../core/services/location.service';
import { NominatimService } from '../../core/services/nominatim.service';
import { Location, ReporteRequest, ReporteService } from '../../core/services/reporte.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { LoadingscreenComponent } from '../../shared/components/loadingscreen/loadingscreen.component';

@Component({
  selector: 'app-create-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FooterComponent,
    LoadingscreenComponent
  ],
  templateUrl: './create-report.component.html',
  styleUrls: ['./create-report.component.css']
})
export class CreateReportComponent implements OnInit {
  reportForm!: FormGroup;
  isLoading = false;
  submitted = false;
  error: string | null = null;
  
  categorias = [
    { id: 'SEGURIDAD', name: 'Seguridad' },
    { id: 'MASCOTAS', name: 'Mascotas' },
    { id: 'COMUNIDAD', name: 'Comunidad' },
    { id: 'EMERGENCIA_MEDICA', name: 'Emergencia Médica' }
  ];
  
  map: L.Map | undefined;
  marker: L.Marker | undefined;
  selectedLocation: Location = { lat: 4.7110, lng: -74.0721 }; // Bogotá por defecto

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private reporteService: ReporteService,
    private locationService: LocationService,
    private nominatimService: NominatimService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initForm(): void {
    this.reportForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      descripcion: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]],
      categoria: ['', [Validators.required]],
      ubicacion: ['', [Validators.required]],
      creadorAnuncio: [''] // Se llenará con el nombre del usuario actual
    });

    // Obtener nombre del usuario desde AuthService
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (user && user.nombreCom) {
      this.reportForm.patchValue({
        creadorAnuncio: user.nombreCom
      });
    }
  }

  private initMap(): void {
    this.map = L.map('map').setView([this.selectedLocation.lat, this.selectedLocation.lng], 16);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);

    // Añadir marcador inicial
    this.marker = L.marker([this.selectedLocation.lat, this.selectedLocation.lng], {
      draggable: true
    }).addTo(this.map);

    // Actualizar ubicación cuando se mueve el marcador
    this.marker.on('dragend', () => {
      if (this.marker) {
        const position = this.marker.getLatLng();
        this.selectedLocation = { lat: position.lat, lng: position.lng };
        this.updateAddress(position.lat, position.lng);
      }
    });

    // Permitir hacer clic en el mapa para actualizar marcador
    this.map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      
      if (this.marker) {
        this.marker.setLatLng([lat, lng]);
      }
      
      this.selectedLocation = { lat, lng };
      this.updateAddress(lat, lng);
    });

    // Intentar obtener la ubicación actual
    this.locationService.getCurrentLocation().then(
      (location) => {
        const { lat, lng } = location;
        
        if (this.map && this.marker) {
          this.map.setView([lat, lng], 16);
          this.marker.setLatLng([lat, lng]);
          this.selectedLocation = { lat: lat , lng: lng };
          this.updateAddress(lat, lng);
        }
      },
      (error) => {
        console.error('Error al obtener la ubicación:', error);
      }
    );
  }

  private updateAddress(lat: number, lng: number): void {
    this.nominatimService.reverseGeocode(lat, lng).subscribe(
      (response) => {
        if (response && response.display_name) {
          this.reportForm.patchValue({
            ubicacion: response.display_name
          });
        } else {
          this.reportForm.patchValue({
            ubicacion: `${lat}, ${lng}` // Fallback en caso de error
          });
        }
      },
      (error) => {
        console.error('Error al obtener dirección:', error);
        this.reportForm.patchValue({
          ubicacion: `${lat}, ${lng}` // Fallback en caso de error
        });
      }
    );
  }

  onSubmit(): void {
    this.submitted = true;
    
    if (this.reportForm.invalid) {
      return;
    }
    
    this.isLoading = true;
    
    const reporteData: ReporteRequest = {
      ...this.reportForm.value,
      locations: [this.selectedLocation] 
    };
    
    this.reporteService.crearReporte(reporteData).subscribe({
      next: (response) => {
        this.isLoading = false;
        // Redirigir al dashboard con un mensaje de éxito
        this.router.navigate(['/dashboard'], { 
          state: { message: 'Reporte creado exitosamente' } 
        });
      },
      error: (error) => {
        this.isLoading = false;
        this.error = error.error?.error || 'Error al crear el reporte. Intente nuevamente.';
        console.error('Error al crear reporte:', error);
      }
    });
  }

  // Getter para acceder fácilmente a los controles del formulario
  get f() { 
    return this.reportForm.controls; 
  }

  cancel(): void {
    this.router.navigate(['/dashboard']);
  }
}