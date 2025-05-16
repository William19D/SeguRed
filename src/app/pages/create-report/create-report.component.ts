import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/authentication.service';
import { LocationService } from '../../core/services/location.service';
import { NominatimService } from '../../core/services/nominatim.service';
import { ReporteService } from '../../core/services/reporte.service';
import * as L from 'leaflet';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-create-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-report.component.html',
  styleUrl: './create-report.component.css'
})
export class CreateReportComponent implements OnInit, AfterViewInit {
  reportForm!: FormGroup;
  submitted = false;
  
  // Cambios para múltiples archivos
  selectedFiles: File[] = [];
  imagePreviews: string[] = [];
  
  useCurrentLocationValue = false;
  currentLocation: { lat: number, lng: number, address?: string } | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  
  // Variables para el mapa
  map: L.Map | undefined;
  marker: L.Marker | undefined;
  showMap = false;

  // Máximo tamaño de archivo en bytes (10MB)
  maxFileSize = 10 * 1024 * 1024;
  // Máximo número de imágenes permitidas
  maxImageCount = 5;

  categorias = [
    { nombre: 'Seguridad', descripcion: 'Problemas relacionados con seguridad ciudadana' },
    { nombre: 'Infraestructura', descripcion: 'Problemas relacionados con infraestructura urbana' },
    { nombre: 'Medio Ambiente', descripcion: 'Problemas relacionados con medio ambiente' },
    { nombre: 'Transporte', descripcion: 'Problemas relacionados con transporte público' },
    { nombre: 'Servicios Públicos', descripcion: 'Problemas relacionados con servicios públicos' },
    { nombre: 'Otros', descripcion: 'Otras situaciones que requieran atención' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private locationService: LocationService,
    private nominatimService: NominatimService,
    private reporteService: ReporteService
  ) {}

  ngOnInit() {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/create-report' } });
      return;
    }

    this.reportForm = this.formBuilder.group({
      titulo: ['', [
        Validators.required, 
        Validators.minLength(5), 
        Validators.maxLength(100)
      ]],
      descripcion: ['', [
        Validators.required, 
        Validators.minLength(20), 
        Validators.maxLength(500)
      ]],
      categoria: [this.categorias[0], [Validators.required]],
      useCurrentLocation: [false],
      direccion: [''],
      declaration: [false, [Validators.requiredTrue]],
      locations: [[]]
    });
    
    // Verificar validez del token
    this.authService.checkTokenExpiration();
  }

  ngAfterViewInit(): void {
    if (this.showMap) {
      this.initMap();
    }
  }

  // Getter para acceder fácilmente a los controles del formulario
  get f() {
    return this.reportForm.controls;
  }

  private initMap(): void {
    // Asegurarse de que el elemento del mapa existe
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Elemento del mapa no encontrado');
      return;
    }
    
    // Establecer las coordenadas iniciales a Bogotá, Colombia
    this.map = L.map('map').setView([4.7110, -74.0721], 16);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);

    // Crear un marcador inicial en el centro de Bogotá
    this.marker = L.marker([4.7110, -74.0721], { draggable: true }).addTo(this.map)
      .bindPopup('Arrastra el marcador para actualizar la ubicación de tu reporte.')
      .openPopup();

    // Cuando se arrastra el marcador, actualizar las coordenadas y la dirección
    this.marker.on('dragend', () => {
      const position = this.marker!.getLatLng();
      this.currentLocation = { lat: position.lat, lng: position.lng };
      this.reportForm.patchValue({
        locations: [{ lat: position.lat, lng: position.lng }]
      });
      this.updateAddress(position.lat, position.lng);
    });

    // Al hacer clic en cualquier parte del mapa, mover el marcador allí
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.marker && this.map) {
        this.marker.setLatLng(e.latlng);
        this.currentLocation = { lat: e.latlng.lat, lng: e.latlng.lng };
        this.reportForm.patchValue({
          locations: [{ lat: e.latlng.lat, lng: e.latlng.lng }]
        });
        this.updateAddress(e.latlng.lat, e.latlng.lng);
      }
    });
  }

  toggleUseCurrentLocation() {
    this.useCurrentLocationValue = this.reportForm.get('useCurrentLocation')?.value;
    
    if (this.useCurrentLocationValue) {
      this.showMap = true;
      setTimeout(() => {
        if (!this.map) {
          this.initMap();
        }
        this.getCurrentLocation();
      }, 100);
      this.reportForm.get('direccion')?.disable();
    } else {
      this.reportForm.get('direccion')?.enable();
    }
  }

  toggleMapVisibility() {
    this.showMap = !this.showMap;
    
    if (this.showMap) {
      // Primero, destruir el mapa existente (si hay) para evitar problemas
      if (this.map) {
        this.map.remove();
        this.map = undefined;
        this.marker = undefined;
      }
      
      // Usamos un timeout más largo para asegurar que el DOM se ha renderizado
      setTimeout(() => {
        // Intentar inicializar el mapa solo cuando el elemento del DOM exista
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
          try {
            this.initMap();
            
            // Si ya teníamos una ubicación, centrar el mapa en ella
            if (this.currentLocation && this.map) {
              this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 16);
              if (this.marker) {
                this.marker.setLatLng([this.currentLocation.lat, this.currentLocation.lng]);
              }
            }
          } catch (error) {
            console.error('Error al inicializar el mapa:', error);
            this.errorMessage = 'Hubo un problema al cargar el mapa. Por favor, intenta nuevamente.';
          }
        } else {
          console.error('Contenedor del mapa no encontrado');
        }
      }, 300); // Aumentado a 300ms para asegurar que el DOM esté completamente renderizado
    }
  }

  getCurrentLocation() {
    this.isLoading = true;
    this.locationService.getCurrentLocation()
      .then((lngLat) => {
        this.currentLocation = {
          lat: lngLat.lat,
          lng: lngLat.lng
        };
        
        this.reportForm.patchValue({
          locations: [{ lat: lngLat.lat, lng: lngLat.lng }]
        });
        
        if (this.map && this.marker) {
          this.map.setView([lngLat.lat, lngLat.lng], 16);
          this.marker.setLatLng([lngLat.lat, lngLat.lng]);
        }
        
        this.updateAddress(lngLat.lat, lngLat.lng);
        this.isLoading = false;
      })
      .catch((error) => {
        console.error('Error getting location', error);
        this.errorMessage = 'No se pudo obtener tu ubicación. Por favor, selecciona manualmente en el mapa.';
        this.isLoading = false;
      });
  }

  private updateAddress(lat: number, lng: number): void {
    this.isLoading = true;
    this.nominatimService.reverseGeocode(lat, lng).subscribe({
      next: (response) => {
        if (response && response.display_name) {
          const address = this.extractPartialAddress(response.display_name);
          
          if (this.currentLocation) {
            this.currentLocation.address = address;
          }
          
          this.reportForm.patchValue({
            direccion: address
          });
        } else {
          if (this.currentLocation) {
            this.currentLocation.address = `${lat}, ${lng}`;
          }
          this.reportForm.patchValue({
            direccion: `${lat}, ${lng}` // Fallback en caso de error
          });
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error getting address', error);
        if (this.currentLocation) {
          this.currentLocation.address = `${lat}, ${lng}`;
        }
        this.reportForm.patchValue({
          direccion: `${lat}, ${lng}` // Fallback en caso de error
        });
        this.isLoading = false;
      }
    });
  }

  private extractPartialAddress(fullAddress: string): string {
    const parts = fullAddress.split(',');
    return parts.slice(0, 2).join(','); // Obtener solo hasta la segunda coma
  }

  // Método mejorado para manejar múltiples archivos
  onFileChange(event: any) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    this.errorMessage = null;
    
    // Verificar si excede el límite de archivos
    if (this.selectedFiles.length + files.length > this.maxImageCount) {
      this.errorMessage = `Puedes subir un máximo de ${this.maxImageCount} imágenes`;
      return;
    }
    
    // Procesar cada archivo seleccionado
    Array.from(files).forEach((file: any) => {
      // Validar tipo de archivo
      if (!file.type.match(/image\/(jpeg|jpg|png|gif|webp)/i)) {
        this.errorMessage = `El archivo "${file.name}" no es una imagen válida`;
        return;
      }
      
      // Validar tamaño
      if (file.size > this.maxFileSize) {
        this.errorMessage = `La imagen "${file.name}" excede el tamaño máximo de 10MB`;
        return;
      }
      
      // Añadir archivo a la lista
      this.selectedFiles.push(file);
      
      // Crear vista previa para este archivo
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviews.push(e.target.result);
      };
      reader.readAsDataURL(file);
    });
  }
  
  // Método para eliminar una imagen
  removeImage(index: number) {
    this.selectedFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  // Método mejorado para envío de reportes con compresión de imágenes
  async onSubmit() {
    this.submitted = true;
    this.errorMessage = null;

    // Validación del formulario
    if (this.reportForm.invalid) {
      this.errorMessage = 'Por favor completa todos los campos obligatorios';
      return;
    }

    // Validar ubicación
    if (!this.currentLocation) {
      this.errorMessage = 'Debes proporcionar una ubicación para el reporte';
      return;
    }

    // Validar al menos una imagen
    if (this.selectedFiles.length === 0) {
      this.errorMessage = 'Debes subir al menos una foto para documentar el reporte';
      return;
    }

    this.isLoading = true;

    try {
      // Procesar todas las imágenes a Base64 con compresión
      const imagePromises = this.selectedFiles.map(file => this.processImage(file));
      const imageBase64Array = await Promise.all(imagePromises);
      
      // Obtener la categoría seleccionada
      const categoriaSeleccionada = this.reportForm.get('categoria')?.value;
      
      // Crear array de objetos de imagen según el formato API
      const imagenes = imageBase64Array.map((base64, index) => ({
        url: base64,
        descripcion: `Imagen ${index + 1}: ${this.reportForm.get('titulo')?.value.substring(0, 30)}`
      }));
      
      // Preparar los datos para la API - importante mantener la estructura exacta
      const reporteRequest = {
        titulo: this.reportForm.get('titulo')?.value,
        descripcion: this.reportForm.get('descripcion')?.value,
        categoria: [categoriaSeleccionada], // Asegurar que sea un array
        locations: {
          latitude: this.currentLocation.lat,
          longitude: this.currentLocation.lng,
          name: this.currentLocation.address || `${this.currentLocation.lat}, ${this.currentLocation.lng}`
        },
        imagenes: imagenes
      };

      console.log('Enviando reporte a la API:', JSON.stringify(reporteRequest).substring(0, 200) + '...');

      // Enviar el reporte usando el servicio mejorado
      this.reporteService.createReporte(reporteRequest)
        .pipe(
          finalize(() => {
            this.isLoading = false;
          })
        )
        .subscribe({
          next: (response: any) => {
            console.log('Reporte creado exitosamente:', response);
            
            // Mostrar mensaje de éxito y redirigir
            this.showSuccessMessage();
            
            // Redirigir después de un breve retraso para que el usuario vea el mensaje
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 1500);
          },
          error: (error) => {
            console.error('Error al crear el reporte:', error);
            this.errorMessage = this.getErrorMessage(error);
          }
        });
    } catch (error) {
      console.error('Error al procesar las imágenes:', error);
      this.errorMessage = 'Error al procesar las imágenes. Por favor, inténtalo de nuevo.';
      this.isLoading = false;
    }
  }

  // Método para mostrar mensaje de éxito
  private showSuccessMessage() {
    const successAlert = document.createElement('div');
    successAlert.className = 'alert alert-success';
    successAlert.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; padding: 15px;';
    successAlert.innerHTML = '<strong>¡Éxito!</strong> Tu reporte ha sido enviado correctamente.';
    document.body.appendChild(successAlert);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
      document.body.removeChild(successAlert);
    }, 3000);
  }
  
  // Método para extraer mensajes de error
  private getErrorMessage(error: any): string {
    return error.error?.message || 
           error.error?.error || 
           'Error al crear el reporte. Por favor, inténtalo de nuevo.';
  }

  // Método mejorado para procesar imágenes con compresión
  processImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = () => {
        const base64 = reader.result as string;
        
        // Si la imagen es grande (>1MB), comprimir
        if (file.size > 1024 * 1024) {
          this.compressImage(base64)
            .then(compressed => resolve(compressed))
            .catch(err => {
              console.warn('Compresión fallida, usando original:', err);
              resolve(base64);
            });
        } else {
          resolve(base64);
        }
      };
      
      reader.onerror = error => reject(error);
    });
  }

  // Método para comprimir imágenes grandes
  compressImage(base64: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Determinar el tamaño de destino (max 1200px en cualquier dimensión)
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200;
        
        if (width > height && width > maxDimension) {
          height = Math.round(height * maxDimension / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round(width * maxDimension / height);
          height = maxDimension;
        }
        
        // Crear canvas para compresión
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo crear el contexto del canvas'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Comprimir como JPEG con calidad 0.7 (70%)
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      
      img.onerror = () => {
        reject(new Error('Error al cargar imagen para compresión'));
      };
      
      img.src = base64;
    });
  }

  // Método legacy mantenido para compatibilidad
  fileToBase64(file: File): Promise<string> {
    return this.processImage(file);
  }
}