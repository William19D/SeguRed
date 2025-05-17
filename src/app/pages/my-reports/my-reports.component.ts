import { Component, OnInit, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/authentication.service';
import { ReporteService } from '../../core/services/reporte.service';
import { NominatimService } from '../../core/services/nominatim.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-my-reports',
  templateUrl: './my-reports.component.html',
  styleUrls: ['./my-reports.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink]
})
export class MyReportsComponent implements OnInit, AfterViewChecked {
  // Usuario actual
  user: any = null;
  
  // Estados de carga y error
  loading = true;
  error = false;
  
  // Reportes
  userReports: any[] = [];
  filteredReports: any[] = [];
  
  // Búsqueda y filtrado
  searchTerm = '';
  statusFilter = 'all';
  
  // Paginación
  itemsPerPage = 6;
  currentPage = 1;
  totalPages = 1;
  
  // Mapas
  mapsToInitialize: string[] = [];
  mapInstances: Map<string, L.Map> = new Map();
  markerInstances: Map<string, L.Marker> = new Map();
  
  // URL base de la API
  apiUrl = 'https://seguredapi-919088633053.us-central1.run.app';

  constructor(
    private router: Router,
    private authService: AuthService,
    private reporteService: ReporteService,
    private nominatimService: NominatimService
  ) {}

  ngOnInit(): void {
    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Obtener usuario actual
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.authService.getUserInfo().subscribe({
        next: (userInfo) => {
          this.user = userInfo;
          this.authService.setCurrentUser(userInfo);
          this.loadUserReports();
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
    } else {
      this.loadUserReports();
    }
  }

  ngAfterViewChecked(): void {
    // Inicializar mapas pendientes
    if (this.mapsToInitialize.length > 0) {
      this.initMaps();
    }
  }

  loadUserReports(): void {
    this.loading = true;
    this.error = false;
    
    if (!this.user || !this.user.id) {
      this.error = true;
      this.loading = false;
      return;
    }

    // Obtener reportes del usuario actual
    this.reporteService.getUserReports(this.user.id).subscribe({
      next: (data) => {
        console.log('Reportes de usuario obtenidos:', data);
        this.userReports = this.transformReports(data);
        this.filterReports();
        this.loading = false;
        
        // Preparar mapas después de renderizar
        setTimeout(() => {
          this.prepareMapInitialization();
        }, 200);
      },
      error: (err) => {
        console.error('Error al cargar reportes del usuario:', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  transformReports(reports: any[]): any[] {
    if (!Array.isArray(reports)) {
      console.error('Los datos recibidos no son un array:', reports);
      return [];
    }
    
    return reports.map(report => {
      try {
        // URL de imagen por defecto
        let imageUrl = 'assets/imagenotfound.jpg';
        
        // Procesar imágenes si existen
        if (report.imagenes && Array.isArray(report.imagenes) && report.imagenes.length > 0) {
          imageUrl = `${this.apiUrl}/api/reportes-imagenes/${report.id}/imagen/0`;
        }
        
        // Procesar ubicación
        let location = { lat: null as number | null, lng: null as number | null };
        let direccion = 'Sin ubicación';
        
        if (report.locations && report.locations.lat !== undefined && report.locations.lng !== undefined) {
          location = {
            lat: report.locations.lat,
            lng: report.locations.lng
          };
          
          // Formatear coordenadas como respaldo
          if (location.lat !== null && location.lng !== null) {
            direccion = `Coordenadas: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
          }
        }
        
        // Estado por defecto si no existe
        const estado = report.estado || 'Espera';
        
        return {
          id: report.id,
          titulo: report.titulo || 'Sin título',
          descripcion: report.descripcion || 'Sin descripción',
          direccion: report.direccion || direccion,
          fechaPublicacion: report.fechaPublicacion,
          fechaActualizacion: report.fechaActualizacion,
          estado: estado,
          imageUrl: imageUrl,
          location: location,
          likes: report.likes || 0,
          mapId: `map-${report.id}`
        };
      } catch (error) {
        console.error('Error al transformar reporte:', error, report);
        return null;
      }
    }).filter(report => report !== null); // Eliminar reportes nulos
  }

  filterReports(): void {
    let filtered = [...this.userReports];
    
    // Filtrar por término de búsqueda
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(report => 
        report.titulo.toLowerCase().includes(searchLower) || 
        report.descripcion.toLowerCase().includes(searchLower) ||
        report.direccion.toLowerCase().includes(searchLower)
      );
    }
    
    // Filtrar por estado
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(report => report.estado === this.statusFilter);
    }
    
    // Ordenar por fecha (más recientes primero)
    filtered.sort((a, b) => 
      new Date(b.fechaPublicacion).getTime() - new Date(a.fechaPublicacion).getTime()
    );
    
    // Configurar paginación
    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    
    // Aplicar paginación
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.filteredReports = filtered.slice(startIndex, endIndex);
    
    // Preparar la inicialización de los mapas
    setTimeout(() => {
      this.prepareMapInitialization();
    }, 200);
  }

  prepareMapInitialization(): void {
    // Recopilar todos los reportes con coordenadas válidas
    this.mapsToInitialize = this.filteredReports
      .filter(report => report.location && report.location.lat !== null && report.location.lng !== null)
      .map(report => report.mapId);
    
    if (this.mapsToInitialize.length > 0) {
      this.initMaps();
    }
  }

  initMaps(): void {
    const initializedMaps: string[] = [];
    
    for (const mapId of this.mapsToInitialize) {
      const mapElement = document.getElementById(mapId);
      if (mapElement) {
        const report = this.filteredReports.find(r => r.mapId === mapId);
        
        if (report && report.location && report.location.lat !== null && report.location.lng !== null) {
          try {
            // Limpiar mapa si ya existía
            if (this.mapInstances.has(mapId)) {
              this.mapInstances.get(mapId)?.remove();
            }

            // Inicializar mapa
            const map = L.map(mapId, {
              center: [report.location.lat, report.location.lng],
              zoom: 15,
              zoomControl: false,
              attributionControl: false,
              dragging: true,
              scrollWheelZoom: true,
              doubleClickZoom: true,
              touchZoom: true
            });
            
            // Añadir controles de zoom
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
            
            // Añadir marcador
            const marker = L.marker([report.location.lat, report.location.lng], { 
              draggable: false
            }).addTo(map);
            
            // Configurar popup del marcador
            marker.bindPopup(`<strong>${report.titulo}</strong><br>${report.direccion}`);
            
            // Guardar referencia del marcador
            this.markerInstances.set(mapId, marker);
            
            // Obtener dirección real basada en coordenadas
            this.updateAddressForReport(report);
            
            initializedMaps.push(mapId);
          } catch (error) {
            console.error(`Error al inicializar mapa ${mapId}:`, error);
          }
        }
      }
    }
    
    // Eliminar los mapas inicializados de la lista pendiente
    this.mapsToInitialize = this.mapsToInitialize.filter(id => !initializedMaps.includes(id));
  }

  updateAddressForReport(report: any): void {
    if (report && report.location && report.location.lat !== null && report.location.lng !== null) {
      this.nominatimService.reverseGeocode(report.location.lat, report.location.lng).subscribe({
        next: (response) => {
          if (response && response.display_name) {
            // Extraer dirección legible
            const address = this.extractAddress(response.display_name);
            
            // Actualizar dirección en el reporte
            report.direccion = address;
            
            // Actualizar popup del marcador
            const marker = this.markerInstances.get(report.mapId);
            if (marker) {
              marker.setPopupContent(`<strong>${report.titulo}</strong><br>${address}`);
            }
          }
        },
        error: (error) => {
          console.error('Error al obtener dirección:', error);
        }
      });
    }
  }

  extractAddress(fullAddress: string): string {
    const parts = fullAddress.split(',');
    return parts.slice(0, 3).join(',').trim();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.filterReports();
    }
  }

  createNewReport(): void {
    this.router.navigate(['/create-report']);
  }

  appealReport(report: any): void {
    // Implementar la lógica para apelar un reporte rechazado
    console.log('Apelar reporte:', report);
    
    // Ejemplo: Navegar a un formulario de apelación
    this.router.navigate(['/appeal-report', report.id]);
  }

  confirmDeleteReport(report: any): void {
    // Mostrar confirmación antes de eliminar
    if (confirm(`¿Estás seguro que deseas eliminar el reporte "${report.titulo}"?`)) {
      this.deleteReport(report);
    }
  }

  deleteReport(report: any): void {
    // Implementar la lógica para eliminar un reporte
    this.reporteService.deleteReport(report.id).subscribe({
      next: () => {
        // Eliminar del array local
        this.userReports = this.userReports.filter(r => r.id !== report.id);
        this.filterReports();
        
        // Mostrar mensaje de éxito
        alert('Reporte eliminado correctamente');
      },
      error: (err) => {
        console.error('Error al eliminar el reporte:', err);
        alert('No se pudo eliminar el reporte. Por favor intenta de nuevo.');
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getStatusClass(status: string): string {
  // Normalizar el estado a minúsculas para comparaciones más flexibles
  const normalizedStatus = status?.toLowerCase() || '';
  
  if (normalizedStatus.includes('elimin')) {
    return 'status-deleted';
  } else if (normalizedStatus.includes('espera')) {
    return 'status-pending';
  } else if (normalizedStatus.includes('activ') || normalizedStatus.includes('resuelto') || normalizedStatus.includes('completado')) {
    return 'status-resolved';
  } else if (normalizedStatus.includes('rechaz') || normalizedStatus.includes('deneg')) {
    return 'status-rejected';
  } else if (normalizedStatus.includes('revis')) {
    return 'status-review';
  }
  
  // Estado desconocido, usar clase por defecto (amarillo)
  return 'status-pending';
}

  canAppeal(report: any): boolean {
    // Un reporte rechazado se puede apelar dentro de un plazo de 3 días
    if (report.estado !== 'Rechazado') return false;
    
    const rejectionDate = new Date(report.fechaActualizacion || report.fechaPublicacion);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - rejectionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysDiff <= 3;
  }

  hideSpinner(event: any): void {
    event.target.classList.add('loaded');
  }

  handleImageError(event: any): void {
    event.target.src = 'assets/imagenotfound.jpg';
    event.target.classList.add('loaded');
  }
}