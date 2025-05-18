import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/authentication.service';
import { LocationService } from '../../core/services/location.service';
import { NominatimService } from '../../core/services/nominatim.service';
import { ReporteService } from '../../core/services/reporte.service';
import * as L from 'leaflet';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-create-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-report.component.html',
  styleUrl: './create-report.component.css'
})
export class CreateReportComponent implements OnInit, AfterViewInit, OnDestroy {
  reportForm!: FormGroup;
  submitted = false;
  
  // Variables para manejo de archivos
  selectedFiles: File[] = [];
  imagePreviews: string[] = [];
  
  // Variables para manejo de ubicación
  useCurrentLocationValue = false;
  currentLocation: { lat: number, lng: number, address?: string } | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  
  // Variables para el mapa
  map: L.Map | undefined;
  marker: L.Marker | undefined;
  showMap = false;
  private subscriptions: Subscription[] = [];

  // Configuración y límites
  maxFileSize = 10 * 1024 * 1024; // 10MB
  maxImageCount = 5;
  minImageQuality = 0.3; // Calidad mínima para compresión extrema
  mediumImageQuality = 0.5; // Calidad media para compresión normal
  maxImageDimension = 800; // Máximo tamaño para cualquier dimensión
  reducedImageDimension = 400; // Tamaño reducido para imágenes problemáticas

  // Categorías disponibles
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
    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/create-report' } });
      return;
    }

    // Inicializar formulario con validadores
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

  ngOnDestroy(): void {
    // Limpiar suscripciones para evitar memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Limpiar mapa si existe
    if (this.map) {
      this.map.remove();
      this.map = undefined;
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
    
    try {
      // Establecer las coordenadas iniciales a Bogotá, Colombia
      this.map = L.map('map').setView([4.7110, -74.0721], 16);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(this.map);

      // Crear un marcador inicial
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
    } catch (error) {
      console.error('Error al inicializar mapa:', error);
      this.errorMessage = 'Error al inicializar el mapa. Por favor, recarga la página.';
    }
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
      // Limpiar mapa existente si lo hay
      if (this.map) {
        this.map.remove();
        this.map = undefined;
        this.marker = undefined;
      }
      
      // Inicializar el mapa con un timeout para asegurar que el DOM se ha renderizado
      setTimeout(() => {
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
          try {
            this.initMap();
            
            // Centrar el mapa en la ubicación actual si existe
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
      }, 300);
    }
  }

  getCurrentLocation() {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.locationService.getCurrentLocation()
      .then((lngLat) => {
        this.currentLocation = {
          lat: lngLat.lat,
          lng: lngLat.lng
        };
        
        this.reportForm.patchValue({
          locations: [{ lat: lngLat.lat, lng: lngLat.lng }]
        });
        
        // Centrar el mapa en la ubicación obtenida
        if (this.map && this.marker) {
          this.map.setView([lngLat.lat, lngLat.lng], 16);
          this.marker.setLatLng([lngLat.lat, lngLat.lng]);
        }
        
        this.updateAddress(lngLat.lat, lngLat.lng);
      })
      .catch((error) => {
        console.error('Error obteniendo ubicación actual:', error);
        this.errorMessage = 'No se pudo obtener tu ubicación. Por favor, selecciona manualmente en el mapa.';
        this.isLoading = false;
      });
  }

  private updateAddress(lat: number, lng: number): void {
    this.isLoading = true;
    
    const subscription = this.nominatimService.reverseGeocode(lat, lng).subscribe({
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
          // Fallback con coordenadas si no hay display_name
          if (this.currentLocation) {
            this.currentLocation.address = `${lat}, ${lng}`;
          }
          this.reportForm.patchValue({
            direccion: `${lat}, ${lng}`
          });
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error obteniendo dirección:', error);
        // Fallback con coordenadas en caso de error
        if (this.currentLocation) {
          this.currentLocation.address = `${lat}, ${lng}`;
        }
        this.reportForm.patchValue({
          direccion: `${lat}, ${lng}`
        });
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(subscription);
  }

  private extractPartialAddress(fullAddress: string): string {
    const parts = fullAddress.split(',');
    // Devolver una dirección más legible
    return parts.slice(0, 3).join(',').trim();
  }

  onFileChange(event: any) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    this.errorMessage = null;
    
    // Verificar si excede el límite de archivos
    if (this.selectedFiles.length + files.length > this.maxImageCount) {
      this.errorMessage = `Solo puedes subir hasta ${this.maxImageCount} imágenes en total`;
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
  
  removeImage(index: number) {
    if (index >= 0 && index < this.selectedFiles.length) {
      this.selectedFiles.splice(index, 1);
      this.imagePreviews.splice(index, 1);
    }
  }

  async onSubmit() {
    this.submitted = true;
    this.errorMessage = null;

    // Validaciones iniciales
    if (this.reportForm.invalid) {
      if (this.f['declaration'].errors) {
        this.errorMessage = 'Debes aceptar la declaración de veracidad';
      } else {
        this.errorMessage = 'Por favor completa todos los campos obligatorios';
      }
      this.scrollToFirstError();
      return;
    }

    if (!this.currentLocation) {
      this.errorMessage = 'Debes proporcionar una ubicación para el reporte';
      this.scrollToFirstError();
      return;
    }

    if (this.selectedFiles.length === 0) {
      this.errorMessage = 'Debes subir al menos una foto para documentar el reporte';
      this.scrollToFirstError();
      return;
    }

    this.isLoading = true;
    this.showProgressMessage('Procesando imágenes...');

    try {
      // Procesar imágenes con compresión optimizada
      const imagePromises = this.selectedFiles.map(file => this.processImageForServer(file));
      const imageBase64Array = await Promise.all(imagePromises);
      
      this.showProgressMessage('Preparando envío...');
      
      // Obtener categoría seleccionada
      const categoriaSeleccionada = this.reportForm.get('categoria')?.value;
      
      // Estructura de imágenes en formato correcto para el backend
      const imagenes = imageBase64Array.map((base64, index) => {
        return {
          nombre: `reporte_img_${index + 1}_${Date.now()}.jpg`,
          content: base64
        };
      });
      
      // Estructura completa del reporte
      const reporteRequest = {
        titulo: this.reportForm.get('titulo')?.value,
        descripcion: this.reportForm.get('descripcion')?.value,
        categoria: [{
          descripcion: categoriaSeleccionada.descripcion
        }],
        locations: {
          lat: this.currentLocation.lat,
          lng: this.currentLocation.lng,
          direccion: this.currentLocation.address || 
                    `${this.currentLocation.lat}, ${this.currentLocation.lng}`
        },
        imagenes: imagenes
      };

      // Log de diagnóstico
      console.log(`Enviando reporte: "${reporteRequest.titulo}" con ${imagenes.length} imágenes`);
      console.log('Tamaño total de datos aproximado:', this.calculateApproximateSize(reporteRequest), 'bytes');

      // Enviar reporte
      this.showProgressMessage('Enviando reporte...');
      this.reporteService.createReporte(reporteRequest)
        .pipe(finalize(() => {
          this.isLoading = false;
          this.clearProgressMessage();
        }))
        .subscribe({
          next: (response: any) => {
            console.log('Reporte creado exitosamente:', response);
            this.showSuccessMessage();
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 1500);
          },
          error: (error) => {
            console.error('Error al crear el reporte:', error);
            
            // Mensaje de error mejorado
            if (error.userMessage) {
              this.errorMessage = error.userMessage;
            } else if (error.error?.message) {
              this.errorMessage = `Error: ${error.error.message}`;
            } else if (error.status === 413) {
              this.errorMessage = 'El reporte es demasiado grande. Intenta con menos imágenes o redúcelas más.';
            } else {
              this.errorMessage = 'Error al crear el reporte. Por favor, inténtalo de nuevo.';
            }
            
            this.scrollToFirstError();
          }
        });
    } catch (error) {
      console.error('Error al procesar las imágenes:', error);
      this.errorMessage = 'Error al procesar las imágenes. Por favor, inténtalo de nuevo.';
      this.isLoading = false;
      this.clearProgressMessage();
      this.scrollToFirstError();
    }
  }

  // Método optimizado para procesar imágenes para el servidor
  processImageForServer(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const base64WithPrefix = reader.result as string;
          
          // Estrategia de compresión adaptativa basada en tamaño
          let finalImage;
          
          // Aplicar nivel de compresión basado en el tamaño del archivo
          if (file.size > 5 * 1024 * 1024) { // > 5MB: compresión fuerte
            finalImage = await this.compressImageForServer(base64WithPrefix, this.minImageQuality);
          } else if (file.size > 1 * 1024 * 1024) { // > 1MB: compresión media
            finalImage = await this.compressImageForServer(base64WithPrefix, this.mediumImageQuality);
          } else { // < 1MB: compresión estándar
            finalImage = await this.compressImageForServer(base64WithPrefix, this.mediumImageQuality);
          }
          
          // Quitar prefijo MIME
          const cleanBase64 = this.removeBase64Prefix(finalImage);
          
          // Verificar que el resultado sea válido
          if (!cleanBase64 || cleanBase64.length < 100) {
            throw new Error('Resultado de compresión inválido');
          }
          
          resolve(cleanBase64);
        } catch (err) {
          console.warn('Primer intento de compresión fallido, intentando con calidad reducida...', err);
          
          try {
            // Segundo intento con configuración más agresiva
            const reducedImage = await this.reduceImageSize(reader.result as string, this.minImageQuality);
            const cleanReduced = this.removeBase64Prefix(reducedImage);
            resolve(cleanReduced);
          } catch (secondErr) {
            console.error('Error en ambos intentos de compresión:', secondErr);
            
            // Último recurso: usar original sin prefijo
            const originalClean = this.removeBase64Prefix(reader.result as string);
            resolve(originalClean);
          }
        }
      };
      
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  // Método para quitar el prefijo MIME de cadenas base64
  removeBase64Prefix(base64String: string): string {
    if (!base64String) return '';
    
    // Extraer solo el contenido después del prefijo
    if (base64String.includes(',')) {
      return base64String.substring(base64String.indexOf(',') + 1);
    }
    return base64String;
  }

  // Método optimizado para compresión de imágenes
  compressImageForServer(base64: string, quality = 0.4): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!base64) {
        reject(new Error('Base64 vacío'));
        return;
      }
      
      const img = new Image();
      
      img.onload = () => {
        try {
          // Reducir resolución para dimensión máxima
          let width = img.width;
          let height = img.height;
          
          if (width > height && width > this.maxImageDimension) {
            height = Math.round(height * this.maxImageDimension / width);
            width = this.maxImageDimension;
          } else if (height > this.maxImageDimension) {
            width = Math.round(width * this.maxImageDimension / height);
            height = this.maxImageDimension;
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo crear el contexto del canvas'));
            return;
          }
          
          // Dibujar la imagen en el canvas
          ctx.fillStyle = '#FFFFFF'; // Fondo blanco
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          // Comprimir como JPEG con calidad especificada
          const compressedImage = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedImage);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Error al cargar imagen para compresión'));
      };
      
      img.src = base64;
    });
  }

  // Método para reducción extrema de tamaño de imagen
  reduceImageSize(base64: string, quality = 0.3): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!base64) {
        reject(new Error('Base64 vacío'));
        return;
      }
      
      const img = new Image();
      
      img.onload = () => {
        try {
          // Reducción drástica de resolución
          let width = img.width;
          let height = img.height;
          
          if (width > height && width > this.reducedImageDimension) {
            height = Math.round(height * this.reducedImageDimension / width);
            width = this.reducedImageDimension;
          } else if (height > this.reducedImageDimension) {
            width = Math.round(width * this.reducedImageDimension / height);
            height = this.reducedImageDimension;
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo crear el contexto del canvas'));
            return;
          }
          
          // Dibujar la imagen con fondo blanco
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          // Comprimir como JPEG con calidad muy reducida
          const reducedImage = canvas.toDataURL('image/jpeg', quality);
          resolve(reducedImage);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Error al reducir imagen'));
      };
      
      img.src = base64;
    });
  }

  // Método para mostrar mensaje de éxito
  private showSuccessMessage() {
    const successAlert = document.createElement('div');
    successAlert.className = 'alert-success';
    successAlert.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      padding: 15px 20px;
      background-color: #4caf50;
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
    `;
    
    const icon = document.createElement('span');
    icon.innerHTML = '✅';
    icon.style.marginRight = '10px';
    icon.style.fontSize = '20px';
    
    const message = document.createElement('span');
    message.textContent = '¡Reporte enviado con éxito!';
    message.style.fontWeight = '500';
    
    successAlert.appendChild(icon);
    successAlert.appendChild(message);
    document.body.appendChild(successAlert);
    
    // Eliminar después de 2.5 segundos
    setTimeout(() => {
      document.body.removeChild(successAlert);
    }, 2500);
  }
  
  // Método para mostrar mensaje de progreso
  private showProgressMessage(text: string) {
    // Eliminar mensaje existente si hay
    this.clearProgressMessage();
    
    const progressAlert = document.createElement('div');
    progressAlert.id = 'progress-message';
    progressAlert.className = 'progress-alert';
    progressAlert.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      padding: 12px 20px;
      background-color: #2196f3;
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
    `;
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.style.cssText = `
      border: 3px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top: 3px solid white;
      width: 16px;
      height: 16px;
      margin-right: 12px;
      animation: spin 1s linear infinite;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    const message = document.createElement('span');
    message.textContent = text;
    
    progressAlert.appendChild(spinner);
    progressAlert.appendChild(message);
    document.body.appendChild(progressAlert);
  }
  
  private clearProgressMessage() {
    const existing = document.getElementById('progress-message');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }
  
  // Método para hacer scroll al primer error
  private scrollToFirstError() {
    setTimeout(() => {
      const errorElement = document.querySelector('.error-message');
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }
  
  // Calcular tamaño aproximado del payload
  private calculateApproximateSize(obj: any): number {
    // Convertir a JSON para medir tamaño
    const jsonString = JSON.stringify(obj);
    
    // Convertir cada caracter a bytes (aproximado)
    return new Blob([jsonString]).size;
  }
}