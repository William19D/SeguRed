import { Component, OnInit, AfterViewInit, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/authentication.service';
import { ReporteService } from '../../core/services/reporte.service';
import { NominatimService } from '../../core/services/nominatim.service'; // Importar el servicio Nominatim
import { FooterComponent } from '../../shared/components/footer/footer.component';
import * as L from 'leaflet';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [FooterComponent, CommonModule, RouterLink],
  standalone: true,
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewChecked {
  user: any = null;
  loading = true;
  error = false;
  successMessage: string | null = null;
  
  reports: any[] = [];
  reportsLoading = true;
  reportsError = false;
  apiUrl = 'https://seguredapi-919088633053.us-central1.run.app';
  mapsToInitialize: string[] = [];
  mapInstances: Map<string, L.Map> = new Map(); // Para mantener referencias a las instancias de los mapas
  markerInstances: Map<string, L.Marker> = new Map(); // Para mantener referencias a los marcadores

  constructor(
    private router: Router, 
    private authService: AuthService,
    private reporteService: ReporteService,
    private nominatimService: NominatimService // Inyectar el servicio Nominatim
  ) {}

  ngOnInit() {
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Obtener datos del usuario
    this.user = this.authService.getCurrentUser();

    if (this.user) {
      this.loading = false;
      this.loadReports(); 
    } else {
      this.authService.getUserInfo().subscribe({
        next: (userInfo) => {
          this.user = userInfo;
          this.loading = false;
          this.authService.setCurrentUser(userInfo);
          this.loadReports();
        },
        error: (err) => {
          console.error('Error al obtener información del usuario:', err);
          this.error = true;
          this.loading = false;

          if (err.status === 401) {
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }
      });
    }
  }

  ngAfterViewChecked() {
    // Inicializar mapas pendientes
    if (this.mapsToInitialize.length > 0) {
      this.initMaps();
    }
  }

  loadReports() {
    this.reportsLoading = true;
    this.reportsError = false;
    
    this.reporteService.getAllReportes().subscribe({
      next: (data) => {
        console.log('Reportes obtenidos de la API:', data);
        this.reports = this.transformReportes(data);
        this.reportsLoading = false;
        
        // Programar inicialización de mapas después de renderizar
        setTimeout(() => {
          this.prepareMapInitialization();
        }, 100);
      },
      error: (err) => {
        console.error('Error al cargar reportes:', err);
        this.reportsError = true;
        this.reportsLoading = false;
      }
    });
  }

  transformReportes(reportes: any[]): any[] {
    if (!Array.isArray(reportes)) {
      console.error('Los datos recibidos no son un array:', reportes);
      return [];
    }
    
    return reportes.map(reporte => {
      try {
        console.log('Procesando reporte:', reporte.id || 'sin ID');
        
        // URL de imagen por defecto
        let imageUrl = 'imagenotfound.png';
        
        // Procesar imágenes si existen
        if (reporte.imagenes && Array.isArray(reporte.imagenes) && reporte.imagenes.length > 0) {
          imageUrl = `${this.apiUrl}/api/reportes-imagenes/${reporte.id}/imagen/0`;
        }
        
        // Extraer ubicación
        let location = { lat: null as number | null, lng: null as number | null };
        let direccion = 'Sin ubicación';
        
        if (reporte.locations && reporte.locations.lat !== undefined && reporte.locations.lng !== undefined) {
          location = {
            lat: reporte.locations.lat,
            lng: reporte.locations.lng
          };
          direccion = `Lat: ${location.lat?.toFixed(6) || 'N/A'}, Lng: ${location.lng?.toFixed(6) || 'N/A'}`;
        }
        
        // Formato correcto de fecha
        const fechaPublicacion = new Date(reporte.fechaPublicacion);
        const tiempoTranscurrido = this.calcularTiempoTranscurrido(fechaPublicacion);
        
        // Procesar categoría
        let nombreCategoria = 'General';
        let descripcionCategoria = '';
        
        if (reporte.categoria && Array.isArray(reporte.categoria) && reporte.categoria.length > 0) {
          const cat = reporte.categoria[0];
          
          if (cat.descripcion) {
            nombreCategoria = this.obtenerNombreCategoria(cat.descripcion);
            descripcionCategoria = cat.descripcion;
          }
        }
        
        return {
          id: reporte.id || 'sin-id',
          title: reporte.titulo || 'Sin título',
          distance: '200m', // Valor predeterminado
          address: direccion,
          description: reporte.descripcion || 'Sin descripción',
          generatedTime: tiempoTranscurrido,
          category: nombreCategoria,
          categoryDescription: descripcionCategoria,
          categoryClass: this.obtenerClaseCategoria(nombreCategoria),
          stars: typeof reporte.likes === 'number' ? reporte.likes : 0,
          imageUrl: imageUrl,
          mapId: `map-${reporte.id || Math.random().toString(36).substring(2, 11)}`,
          location: location,
          estado: reporte.estado || 'Desconocido'
        };
      } catch (error) {
        console.error('Error al transformar reporte:', error, reporte);
        return this.crearReporteDefault();
      }
    });
  }

  prepareMapInitialization() {
    // Recopilar todos los reportes con coordenadas válidas
    this.mapsToInitialize = this.reports
      .filter(report => report.location && report.location.lat && report.location.lng)
      .map(report => report.mapId);
    
    if (this.mapsToInitialize.length > 0) {
      this.initMaps();
    }
  }

initMaps() {
  const initializedMaps: string[] = [];
  
  for (const mapId of this.mapsToInitialize) {
    const mapElement = document.getElementById(mapId);
    if (mapElement) {
      const report = this.reports.find(r => r.mapId === mapId);
      
      if (report && report.location && report.location.lat && report.location.lng) {
        try {
          // Limpiar mapa si ya existía
          if (this.mapInstances.has(mapId)) {
            this.mapInstances.get(mapId)?.remove();
          }

          // Optimizado para espacio cuadrado pequeño
          const map = L.map(mapId, {
            center: [report.location.lat, report.location.lng],
            zoom: 16, // Mayor zoom para espacio reducido
            zoomControl: true, // Activamos controles por defecto
            attributionControl: true,
            dragging: true,
            scrollWheelZoom: true,
            doubleClickZoom: true
          });
          
          // Añadir controles de zoom pequeños en esquina inferior derecha
          L.control.zoom({
            position: 'bottomright',
            zoomInTitle: '+',
            zoomOutTitle: '-'
          }).addTo(map);
          
          // Guardar referencia
          this.mapInstances.set(mapId, map);
          
          // Añadir tiles de OpenStreetMap
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);
          
          // Marcador más pequeño y centrado
          const marker = L.marker([report.location.lat, report.location.lng], { 
            draggable: false
          }).addTo(map);
          
          // No abrimos popup automáticamente para ahorrar espacio
          marker.bindPopup(`<strong>${report.title}</strong><br>${report.address}`);
          
          this.markerInstances.set(mapId, marker);
          this.updateAddressForReport(report);
          
          initializedMaps.push(mapId);
        } catch (error) {
          console.error(`Error al inicializar mapa ${mapId}:`, error);
        }
      }
    }
  }
  
  this.mapsToInitialize = this.mapsToInitialize.filter(id => !initializedMaps.includes(id));
}

  // Método para actualizar la dirección usando nominatim (como en el componente de registro)
  updateAddressForReport(report: any): void {
    if (report && report.location && report.location.lat && report.location.lng) {
      this.nominatimService.reverseGeocode(report.location.lat, report.location.lng).subscribe({
        next: (response) => {
          if (response && response.display_name) {
            // Extraer una dirección más legible
            const address = this.extractPartialAddress(response.display_name);
            
            // Actualizar la dirección en el reporte
            report.address = address;
            
            // Actualizar el popup del marcador con la nueva dirección
            const marker = this.markerInstances.get(report.mapId);
            if (marker) {
              marker.setPopupContent(`<strong>${report.title}</strong><br>${address}`);
            }
          }
        },
        error: (error) => {
          console.error('Error al obtener la dirección:', error);
        }
      });
    }
  }

  // Extraer una dirección más legible, similar al componente de registro
  private extractPartialAddress(fullAddress: string): string {
    const parts = fullAddress.split(',');
    return parts.slice(0, 3).join(',').trim(); // Tomar solo las 3 primeras partes
  }

  // Resto de métodos sin cambios...
  obtenerNombreCategoria(descripcion: string): string {
    if (!descripcion) return 'General';
    
    if (descripcion.includes('seguridad')) return 'Seguridad';
    if (descripcion.includes('infraestructura')) return 'Infraestructura';
    if (descripcion.includes('medio ambiente')) return 'Medio Ambiente';
    if (descripcion.includes('transporte')) return 'Transporte';
    if (descripcion.includes('servicios públicos')) return 'Servicios';
    
    return 'General';
  }

  limpiarCampo(valor: any): string {
    if (!valor) return '';
    
    if (typeof valor === 'string' && (
      valor.includes('/') || 
      valor === 'image/jpeg' || 
      valor === 'image/png')
    ) {
      return '';
    }
    
    return String(valor);
  }

  crearReporteDefault(): any {
    return {
      id: 'error',
      title: 'Error al cargar reporte',
      distance: 'N/A',
      address: 'Sin dirección',
      description: 'No se pudo cargar la información del reporte correctamente.',
      generatedTime: 'Fecha desconocida',
      category: 'Error',
      categoryClass: 'error',
      stars: 0,
      imageUrl: 'imagenotfound.png',
      mapId: `map-error-${Math.random().toString(36).substring(2, 11)}`,
      location: { lat: null, lng: null },
      estado: 'Error'
    };
  }

  calcularTiempoTranscurrido(fecha: Date): string {
    const ahora = new Date();
    const diferencia = ahora.getTime() - fecha.getTime();
    const minutos = Math.floor(diferencia / 60000);
    
    if (isNaN(minutos)) return 'Fecha desconocida';
    
    if (minutos < 0) return 'Fecha futura';
    if (minutos < 60) return `hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
    if (minutos < 1440) {
      const horas = Math.floor(minutos / 60);
      return `hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    } else {
      const dias = Math.floor(minutos / 1440);
      return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
    }
  }

  obtenerClaseCategoria(categoria: string): string {
    const categoriaLowerCase = categoria.toLowerCase();
    
    if (categoriaLowerCase.includes('mascota')) return 'mascotas';
    if (categoriaLowerCase.includes('seguridad')) return 'seguridad';
    if (categoriaLowerCase.includes('infraestructura')) return 'infraestructura';
    if (categoriaLowerCase.includes('servicio')) return 'servicios';
    if (categoriaLowerCase.includes('ambiente')) return 'medio-ambiente';
    if (categoriaLowerCase.includes('comunidad')) return 'comunidad';
    if (categoriaLowerCase.includes('error')) return 'error';
    
    return 'general';
  }

  makeReport() {
    this.router.navigate(['/create-report']);
  }
  
  retryLoadReports() {
    this.loadReports();
  }

  hideSpinner(event: any): void {
    event.target.classList.add('loaded');
  }

  handleImageError(event: any): void {
    event.target.src = 'imagenotfound.png';
    event.target.classList.add('loaded');
  }
}