import { Component, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, tap } from 'rxjs/operators';
import { of } from 'rxjs';

import { AuthService } from '../../core/services/authentication.service';
import { ReporteService } from '../../core/services/reporte.service';
import { NominatimService } from '../../core/services/nominatim.service';
import { LocationService } from '../../core/services/location.service';
import { LoadingscreenComponent } from '../../shared/components/loadingscreen/loadingscreen.component';
import * as L from 'leaflet';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoadingscreenComponent
  ],
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css']
})

export class ReportComponent implements OnInit, AfterViewInit {
  reporteId: string | null = null;
  reporte: any = {};
  loading = true;
  errorMessage = '';
  userLiked = false;
  comentarioForm: FormGroup;
  comentarios: any[] = [];
  showAllComments = false;
  commentLoading = false;
  isSubmitting = false; // Prevenir envíos múltiples
  
  // Propiedades para el mapa
  map: L.Map | null = null;
  reportMarker: L.Marker | null = null;
  userMarker: L.Marker | null = null;
  userLocation: { lat: number; lng: number } | null = null;
  reportAddress: string = 'Ubicación desconocida';
  distanceText: string = 'Calculando...';
  // Iconos personalizados para marcadores
  private reportIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0UzMTcwMCI+PHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDljMCA1LjI1IDcgMTMgNyAxM3M3LTcuNzUgNy0xM2MwLTMuODctMy4xMy03LTctN3ptMCA5LjVjLTEuMzggMC0yLjUtMS4xMi0yLjUtMi41czEuMTItMi41IDIuNS0yLjUgMi41IDEuMTIgMi41IDIuNS0xLjEyIDIuNS0yLjUgMi41eiIvPjwvc3ZnPg==',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  private userIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzAwNzVGRiI+PHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDljMCA1LjI1IDcgMTMgNyAxM3M3LTcuNzUgNy0xM2MwLTMuODctMy4xMy03LTctN3ptMCA5LjVjLTEuMzggMC0yLjUtMS4xMi0yLjUtMi41czEuMTItMi41IDIuNS0yLjUgMi41IDEuMTIgMi41IDIuNS0xLjEyIDIuNS0yLjUgMi41eiIvPjwvc3ZnPg==',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
  constructor(
    private route: ActivatedRoute,
    private reporteService: ReporteService,
    public authService: AuthService,  // Cambiado de private a public
    private nominatimService: NominatimService,
    private locationService: LocationService,
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.comentarioForm = this.fb.group({
      texto: ['', [Validators.required, Validators.minLength(3)]]
    });
  }
  
  ngOnInit(): void {
    this.reporteId = this.route.snapshot.paramMap.get('id');
    if (this.reporteId) {
      this.cargarReporte();
      this.getUserLocation();
      this.cargarComentarios();
    }
  }
  
  ngAfterViewInit(): void {
    // No inicializamos el mapa aquí, esperamos a que los datos estén cargados
  }
  
  cargarReporte(): void {
    if (!this.reporteId) return;
    
    this.loading = true;
    this.reporteService.getReporteById(this.reporteId)
      .pipe(
        tap(data => {
          this.reporte = data;
          console.log('Reporte cargado:', this.reporte);
          
          // Asegurarse de que la ubicación tiene el formato correcto
          if (this.reporte.locations && this.reporte.locations.lat && this.reporte.locations.lng) {
            this.reporte.location = {
              lat: this.reporte.locations.lat,
              lng: this.reporte.locations.lng
            };
            console.log('Ubicación del reporte:', this.reporte.location);
          } else {
            console.warn('El reporte no tiene ubicación definida');
          }
          
          // Verificar si el usuario actual ha dado like
          this.userLiked = this.checkUserLiked();
        }),
        catchError(error => {
          console.error('Error al cargar el reporte', error);
          this.errorMessage = 'No se pudo cargar el reporte. Intente nuevamente.';
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
          
          // Inicializar el mapa después de que los datos estén cargados y el componente no esté en estado de carga
          setTimeout(() => {
            if (this.reporte && this.reporte.location) {
              this.initMap();
            }
          }, 500); // Un tiempo mayor para asegurar que el DOM está completamente listo
        })
      )
      .subscribe();
  }
  
  // Método para cargar comentarios del reporte
  // Método para cargar comentarios del reporte
cargarComentarios(): void {
  if (!this.reporteId) return;
  
  this.commentLoading = true;
  
  this.reporteService.getComentarios(this.reporteId)
    .pipe(
      tap(data => {
        // Transformar los comentarios para añadir las propiedades necesarias
        // y filtrar los que tienen estado "Eliminado"
        this.comentarios = data
          .filter(comentario => comentario.estado !== 'Eliminado')
          .map(comentario => this.transformComentario(comentario));
        
        console.log('Comentarios cargados:', this.comentarios.length);
      }),
      catchError(error => {
        console.error('Error al cargar comentarios', error);
        return of([]);
      }),
      finalize(() => {
        this.commentLoading = false;
      })
    )
    .subscribe();
}

// Transforma los comentarios del backend para adaptarlos a nuestra UI
transformComentario(comentario: any): any {
  const userId = this.authService.getCurrentUserId();
  return {
    id: comentario.id,
    texto: comentario.descripcion || comentario.texto,
    userId: comentario.idUsuario,
    userName: comentario.nombre || comentario.userName || 'Usuario anónimo',
    userImage: comentario.userImage || 'default-profile.png',
    fecha: new Date(comentario.fechaPublicacion || comentario.fecha),
      likes: comentario.likes || 0,
      dislikes: comentario.dislikes || 0,
      userLiked: comentario.usersLiked?.includes(userId) || false,
      userDisliked: comentario.usersDisliked?.includes(userId) || false,
      isOwner: comentario.idUsuario === userId,
      isAdmin: this.authService.isAdministrator()
    };
  }
  
  getUserLocation(): void {
    this.locationService.getCurrentLocation()
      .then(location => {
        this.userLocation = location;
        console.log('Ubicación del usuario obtenida:', location);
        
        // Actualizar el marcador del usuario si el mapa ya está inicializado
        if (this.map && this.userLocation) {
          this.addUserMarker();
          
          // Si ya tenemos la ubicación del reporte, calcular distancia
          if (this.reporte && this.reporte.location) {
            this.updateDistance();
          }
        }
      })
      .catch(error => {
        console.error('Error al obtener ubicación del usuario:', error);
      });
  }
  
  initMap(): void {
    // Verificar que el contenedor del mapa existe
    const mapContainer = document.getElementById('report-map');
    if (!mapContainer || !this.reporte.location) {
      console.error('Contenedor del mapa no encontrado o no hay ubicación disponible');
      return;
    }
    
    // Si ya existe un mapa, lo eliminamos para recrearlo
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    console.log('Inicializando mapa con coordenadas:', this.reporte.location);
    
    try {
      // Crear el mapa centrado en la ubicación del reporte
      this.map = L.map('report-map', {
        center: [this.reporte.location.lat, this.reporte.location.lng],
        zoom: 15,
        zoomControl: true,
        attributionControl: true,
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true
      });
      
      // Añadir tiles de OpenStreetMap
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(this.map);
      
      // Añadir marcador para el reporte
      this.addReportMarker();
      
      // Añadir marcador del usuario si ya tenemos su ubicación
      if (this.userLocation) {
        this.addUserMarker();
        this.updateDistance();
      }
      
      // Obtener dirección para el reporte
      this.updateReportAddress();
      
      console.log('Mapa inicializado correctamente');
    } catch (error) {
      console.error('Error al inicializar el mapa:', error);
    }
  }
  
  addReportMarker(): void {
  if (!this.map || !this.reporte.location) return;
  
  try {
    // Usar el icono rojo personalizado para el reporte
    this.reportMarker = L.marker(
      [this.reporte.location.lat, this.reporte.location.lng],
      { icon: this.reportIcon }  // Usar el icono personalizado
    ).addTo(this.map);
    
    // Popup para el marcador
    this.reportMarker.bindPopup(`
      <strong>${this.reporte.titulo || 'Reporte'}</strong><br>
      ${this.reportAddress}
    `).openPopup();
  } catch (error) {
    console.error('Error al añadir marcador del reporte:', error);
  }
}
  
  addUserMarker(): void {
  if (!this.map || !this.userLocation) return;
  
  try {
    // Eliminar marcador anterior si existe
    if (this.userMarker) {
      this.userMarker.remove();
    }
    
    // Usar el icono azul personalizado para la ubicación del usuario
    this.userMarker = L.marker(
      [this.userLocation.lat, this.userLocation.lng],
      { icon: this.userIcon }  // Usar el icono personalizado
    ).addTo(this.map);
    
    // Popup para el marcador
    this.userMarker.bindPopup('Tu ubicación actual');
    
    // Ajustar el zoom para mostrar ambos marcadores
    this.fitMapToBounds();
  } catch (error) {
    console.error('Error al añadir marcador del usuario:', error);
  }
}
  // Variables para el control de imágenes
currentImageIndex = 0;

// Método para obtener la URL de una imagen específica
getImageUrl(index: number): string {
  if (!this.reporte || !this.reporte.id) return '';
  return `https://seguredapi-919088633053.us-central1.run.app/api/reportes-imagenes/${this.reporte.id}/imagen/${index}`;
}

// Navegación del slider
nextImage(): void {
  if (this.reporte.imagenes && this.currentImageIndex < this.reporte.imagenes.length - 1) {
    this.currentImageIndex++;
  }
}

prevImage(): void {
  if (this.currentImageIndex > 0) {
    this.currentImageIndex--;
  }
}

goToImage(index: number): void {
  if (this.reporte.imagenes && index >= 0 && index < this.reporte.imagenes.length) {
    this.currentImageIndex = index;
  }
}

// Teclado para navegación de imágenes (opcional)
@HostListener('window:keydown', ['$event'])
handleKeyboardEvent(event: KeyboardEvent): void {
  if (this.reporte?.imagenes?.length > 1) {
    if (event.key === 'ArrowRight' || event.key === 'Right') {
      this.nextImage();
    } else if (event.key === 'ArrowLeft' || event.key === 'Left') {
      this.prevImage();
    }
  }
}

fitMapToBounds(): void {
  if (!this.map || !this.reportMarker || !this.userMarker) return;

  try {
    // Crear un grupo de capas con ambos marcadores
    const group = new L.FeatureGroup([
      this.reportMarker,
      this.userMarker
    ]);

      // Ajustar el mapa para mostrar todos los marcadores
      this.map.fitBounds(group.getBounds().pad(0.2));
    } catch (error) {
      console.error('Error al ajustar los límites del mapa:', error);
    }
  }
  
  updateReportAddress(): void {
    if (!this.reporte.location) return;
    
    this.nominatimService.reverseGeocode(this.reporte.location.lat, this.reporte.location.lng)
      .subscribe({
        next: (response) => {
          if (response && response.display_name) {
            // Extraer una dirección más legible
            this.reportAddress = this.formatUserAddress(response.display_name);
            console.log('Dirección del reporte obtenida:', this.reportAddress);
            
            // Actualizar el popup del marcador
            if (this.reportMarker) {
              this.reportMarker.setPopupContent(`
                <strong>${this.reporte.titulo || 'Reporte'}</strong><br>
                ${this.reportAddress}
                ${this.distanceText !== 'Calculando...' ? `<br><span style="color:#4284f4">A ${this.distanceText} de tu ubicación</span>` : ''}
              `);
            }
          }
        },
        error: (error) => {
          console.error('Error al obtener dirección:', error);
        }
      });
  }
  
  updateDistance(): void {
    if (!this.userLocation || !this.reporte.location) return;
    
    const distance = this.calculateDistance(
      this.userLocation.lat,
      this.userLocation.lng,
      this.reporte.location.lat,
      this.reporte.location.lng
    );
    
    this.distanceText = this.formatDistance(distance);
    console.log('Distancia calculada:', this.distanceText);
    
    // Actualizar el popup del marcador con la nueva distancia
    if (this.reportMarker) {
      this.reportMarker.setPopupContent(`
        <strong>${this.reporte.titulo || 'Reporte'}</strong><br>
        ${this.reportAddress}
        <br><span style="color:#4285f4">A ${this.distanceText} de tu ubicación</span>
      `);
    }
  }
  
  // Calcular distancia entre dos puntos usando la fórmula de Haversine
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distancia en km
    return d;
  }
  
  // Convertir grados a radianes
  deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
  
  // Formatear la distancia para mostrarla de forma legible
  formatDistance(distance: number): string {
    if (distance < 1) {
      // Si es menos de 1km, mostrar en metros
      return `${Math.round(distance * 1000)}m`;
    } else {
      // Si es más de 1km, mostrar en km con un decimal
      return `${distance.toFixed(1)}km`;
    }
  }
  
  // Método para formatear la dirección de forma más amigable
  private formatUserAddress(fullAddress: string): string {
    if (!fullAddress) return 'Ubicación desconocida';
    
    const parts = fullAddress.split(',').map(part => part.trim());
    
    // Estrategia para extraer partes significativas
    if (parts.length >= 4) {
      const street = parts[0];
      
      // Buscar la ciudad o municipio
      let city = '';
      for (let i = 1; i < Math.min(parts.length, 4); i++) {
        if (parts[i] && parts[i].length > 1) {
          city = parts[i];
          break;
        }
      }
      
      // Tomar estado o provincia
      const state = parts.length > 2 ? parts[parts.length - 2] : '';
      
      // Construir dirección concisa
      let formattedAddress = street;
      if (city) formattedAddress += ', ' + city;
      if (state && state !== city) formattedAddress += ', ' + state;
      
      return formattedAddress;
    }
    
    return parts.slice(0, 3).join(', ');
  }
  
  toggleLike(): void {
    if (!this.authService.isAuthenticated()) {
      alert('Debe iniciar sesión para dar like');
      return;
    }
    
    const userId = this.authService.getCurrentUserId();
    
    if (this.userLiked) {
      // Quitar like
      this.reporteService.removeLike(this.reporteId!, userId)
        .subscribe({
          next: () => {
            this.userLiked = false;
            this.reporte.likes = Math.max((this.reporte.likes || 0) - 1, 0);
          },
          error: (err) => {
            console.error('Error al quitar like', err);
          }
        });
    } else {
      // Dar like
      this.reporteService.addLike(this.reporteId!, userId)
        .subscribe({
          next: () => {
            this.userLiked = true;
            this.reporte.likes = (this.reporte.likes || 0) + 1;
          },
          error: (err) => {
            console.error('Error al dar like', err);
          }
        });
    }
  }
  
  checkUserLiked(): boolean {
    if (!this.authService.isAuthenticated()) return false;
    
    const userId = this.authService.getCurrentUserId();
    return this.reporte.usersLiked?.includes(userId) || false;
  }
  
  // Dar like a un comentario
  likeComentario(comentario: any): void {
    if (!this.authService.isAuthenticated()) {
      alert('Debe iniciar sesión para dar like');
      return;
    }
    
    const userId = this.authService.getCurrentUserId();
    if (comentario.userLiked) {
      // Ya tiene like, quitarlo
      this.reporteService.removeComentarioLike(this.reporteId!, comentario.id, userId)
        .subscribe({
          next: () => {
            comentario.userLiked = false;
            comentario.likes = Math.max((comentario.likes || 0) - 1, 0);
          },
          error: (err) => {
            console.error('Error al quitar like del comentario', err);
          }
        });
    } else {
      // Dar like (quitar dislike si lo tiene)
      if (comentario.userDisliked) {
        comentario.userDisliked = false;
        comentario.dislikes = Math.max((comentario.dislikes || 0) - 1, 0);
      }
      
      this.reporteService.addComentarioLike(this.reporteId!, comentario.id, userId)
        .subscribe({
          next: () => {
            comentario.userLiked = true;
            comentario.likes = (comentario.likes || 0) + 1;
          },
          error: (err) => {
            console.error('Error al dar like al comentario', err);
          }
        });
    }
  }
  
  // Dar dislike a un comentario
  dislikeComentario(comentario: any): void {
    if (!this.authService.isAuthenticated()) {
      alert('Debe iniciar sesión para dar dislike');
      return;
    }
    
    const userId = this.authService.getCurrentUserId();
    if (comentario.userDisliked) {
      // Ya tiene dislike, quitarlo
      this.reporteService.removeComentarioDislike(this.reporteId!, comentario.id, userId)
        .subscribe({
          next: () => {
            comentario.userDisliked = false;
            comentario.dislikes = Math.max((comentario.dislikes || 0) - 1, 0);
          },
          error: (err) => {
            console.error('Error al quitar dislike del comentario', err);
          }
        });
    } else {
      // Dar dislike (quitar like si lo tiene)
      if (comentario.userLiked) {
        comentario.userLiked = false;
        comentario.likes = Math.max((comentario.likes || 0) - 1, 0);
      }
      
      this.reporteService.addComentarioDislike(this.reporteId!, comentario.id, userId)
        .subscribe({
          next: () => {
            comentario.userDisliked = true;
            comentario.dislikes = (comentario.dislikes || 0) + 1;
          },
          error: (err) => {
            console.error('Error al dar dislike al comentario', err);
          }
        });
    }
  }
  
  // Eliminar un comentario
  eliminarComentario(comentario: any): void {
    if (!this.authService.isAuthenticated()) return;
    
    // Solo el propietario o administrador puede eliminar
    if (!comentario.isOwner && !this.authService.isAdministrator()) {
      alert('No tienes permisos para eliminar este comentario');
      return;
    }
    
    if (confirm('¿Estás seguro de eliminar este comentario? Esta acción no se puede deshacer.')) {
      this.reporteService.deleteComentario(this.reporteId!, comentario.id)
        .subscribe({
          next: () => {
            // Eliminar el comentario de la lista
            this.comentarios = this.comentarios.filter(c => c.id !== comentario.id);
          },
          error: (err) => {
            console.error('Error al eliminar comentario', err);
          }
        });
    }
  }
  
  enviarComentario(): void {
    if (this.comentarioForm.invalid || !this.authService.isAuthenticated() || this.isSubmitting) {
      return;
    }
    
    // Prevenir envíos múltiples
    this.isSubmitting = true;
    
    const userId = this.authService.getCurrentUserId();
    const userName = this.authService.getCurrentUserName();
    
    const comentarioData = {
      idReporte: this.reporteId!,
      idUsuario: userId,
      nombre: userName,
      descripcion: this.comentarioForm.value.texto,
      anonimo: false, // Por defecto no anónimo
      userImage: this.authService.getCurrentUserImage() || 'default-profile.png'
    };
    
    console.log('Enviando comentario:', comentarioData);
    
    this.reporteService.addComentario(this.reporteId!, comentarioData)
      .subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);
          
          // Crear un comentario con el formato que esperamos en el frontend
          const nuevoComentario = {
            id: response.id || `temp-${new Date().getTime()}`,
            texto: comentarioData.descripcion,
            userId: comentarioData.idUsuario,
            userName: comentarioData.nombre,
            userImage: comentarioData.userImage,
            fecha: new Date(),
            likes: 0,
            dislikes: 0,
            userLiked: false,
            userDisliked: false,
            isOwner: true,
            isAdmin: this.authService.isAdministrator()
          };
          
          // Agregar al inicio de la lista
          this.comentarios.unshift(nuevoComentario);
          this.comentarioForm.reset();
          
          // Permitir nuevos envíos
          this.isSubmitting = false;
        },
        error: (err) => {
          console.error('Error al enviar comentario', err);
          alert('Ocurrió un error al enviar el comentario. Por favor intenta de nuevo.');
          this.isSubmitting = false;
        }
      });
  }
  
  toggleComments(): void {
    this.showAllComments = !this.showAllComments;
  }
  
  // Devuelve un array con el número de estrellas según los likes
  get starsArray(): number[] {
    const maxStars = 5;
    const likes = this.reporte.likes || 0;
    const filledStars = Math.min(likes, maxStars);
    return Array(maxStars).fill(0).map((_, i) => i < filledStars ? 1 : 0);
  }
  
  getTimeElapsed(date: Date): string {
    const now = new Date();
    const commentDate = new Date(date);
    const diffMs = now.getTime() - commentDate.getTime();
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return `hace un momento`;
    if (diffMins < 60) return `hace ${diffMins} minutos`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return `hace 1 hora`;
    if (diffHours < 24) return `hace ${diffHours} horas`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return `hace 1 día`;
    if (diffDays < 30) return `hace ${diffDays} días`;
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return `hace 1 mes`;
    return `hace ${diffMonths} meses`;
  }

  // Métodos para manejar errores de imágenes
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/imagenotfound.png';
  }

  handleImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.classList.add('loaded');
  }

  handleAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'default-profile.png';
  }
}