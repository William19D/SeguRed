import { Component, OnInit, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/authentication.service';
import { ReporteService } from '../../core/services/reporte.service';
import { NominatimService } from '../../core/services/nominatim.service';
import { LocationService } from '../../core/services/location.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import * as L from 'leaflet';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  imports: [FooterComponent, CommonModule, RouterLink, FormsModule],
  standalone: true,
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, AfterViewChecked {
  // Propiedades de usuario y estados
  user: any = null;
  loading = true;
  error = false;
  
  // Propiedades de reportes
  reports: any[] = [];
  reportsLoading = true;
  reportsError = false;
  filteredReports: any[] = [];
  originalReports: any[] = [];
  apiUrl = 'https://seguredapi-919088633053.us-central1.run.app';
  
  // Propiedades para mapas
  mapsToInitialize: string[] = [];
  mapInstances: Map<string, L.Map> = new Map();
  markerInstances: Map<string, L.Marker> = new Map();
  
  // Propiedades para filtros
  searchTerm: string = '';
  filterStatus: string = 'all';
  categoryFilters: { [key: string]: boolean } = {
    'seguridad': true,
    'infraestructura': true,
    'medio-ambiente': true,
    'transporte': true,
    'servicios': true
  };

  // Contador de estadísticas
  pendingReportsCount: number = 0;
  completedReportsCount: number = 0;
  usersCount: number = 0;
  
  // Modal de confirmación
  showDeleteModal: boolean = false;
  reportToDelete: string | null = null;

  constructor(
    private router: Router, 
    private authService: AuthService,
    private reporteService: ReporteService,
    private nominatimService: NominatimService,
    private locationService: LocationService,
    private notificationService: NotificationService  // <-- Agregar esta línea
  ) {}

  ngOnInit() {
    // Verificar si el usuario está autenticado y es administrador
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Obtener datos del usuario
    this.user = this.authService.getCurrentUser();
    
    // Verificar si es administrador
    if (this.user && this.user.rol !== 'ADMINISTRADOR') {
      this.authService.logout();
      this.router.navigate(['/login']);
      return;
    }

    if (this.user) {
      this.loading = false;
      this.loadReports();
      this.loadUserCount();
    } else {
      this.authService.getUserInfo().subscribe({
        next: (userInfo) => {
          this.user = userInfo;
          
          // Verificar si es administrador
          if (this.user.rol !== 'ADMINISTRADOR') {
            this.authService.logout();
            this.router.navigate(['/login']);
            return;
          }
          
          this.loading = false;
          this.authService.setCurrentUser(userInfo);
          this.loadReports();
          this.loadUserCount();
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
  
  loadUserCount() {
    // Aquí deberías obtener el recuento de usuarios desde tu API
    // Por ahora usamos un valor simulado
    this.usersCount = 176;
  }

  ngAfterViewChecked() {
    // Inicializar mapas pendientes
    if (this.mapsToInitialize.length > 0) {
      this.initMaps();
    }
  }

  // Métodos para filtros
  updateSearchTerm(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.applyFilters();
  }
  
  updateStatusFilter(event: Event): void {
    this.filterStatus = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }
  
  toggleCategoryFilter(category: string): void {
    this.categoryFilters[category] = !this.categoryFilters[category];
    this.applyFilters();
  }

  applyFilters(): void {
    // Comenzar con todos los reportes
    let filtered = [...this.originalReports];
    
    // Aplicar filtro de búsqueda por texto
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(report => 
        report.title?.toLowerCase().includes(search) || 
        report.description?.toLowerCase().includes(search) ||
        report.address?.toLowerCase().includes(search) ||
        report.id?.toLowerCase().includes(search) ||
        report.allCategories?.some((cat: string) => cat.toLowerCase().includes(search))
      );
    }
    
    // Aplicar filtros de estado
    if (this.filterStatus !== 'all') {
      const statusMap: {[key: string]: string} = {
        'pending': 'PENDIENTE',
        'completed': 'COMPLETADO',
        'denied': 'DENEGADO'
      };
      
      const targetStatus = statusMap[this.filterStatus];
      filtered = filtered.filter(report => report.estado === targetStatus);
    }
    
    // Aplicar filtros de categoría
    const selectedCategories = Object.keys(this.categoryFilters)
      .filter(key => this.categoryFilters[key]);
    
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(report => {
        return report.allCategoryClasses?.some((cls: string) => selectedCategories.includes(cls));
      });
    }
    
    // Actualizar los reportes filtrados
    this.filteredReports = filtered;
    
    // Limpiar mapas existentes antes de inicializar nuevos
    this.clearCurrentMaps();

    // Programar inicialización de mapas después de renderizar
    setTimeout(() => {
      if (this.filteredReports.length > 0) {
        this.prepareMapInitialization();
      }
    }, 100);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterStatus = 'all';
    
    // Resetear filtros de categoría
    Object.keys(this.categoryFilters).forEach(key => {
      this.categoryFilters[key] = true;
    });
    
    // Aplicar filtros (mostrar todos)
    this.applyFilters();
  }

  // Carga de reportes
  loadReports() {
    this.reportsLoading = true;
    this.reportsError = false;
    
    this.reporteService.getAllReportes().subscribe({
      next: (data) => {
        console.log('Reportes obtenidos de la API:', data);
        
        // Procesar todos los reportes, incluso los eliminados para el admin
        this.originalReports = this.transformReportes(data);
        
        // Contar reportes por estado
        this.pendingReportsCount = this.originalReports.filter(r => r.estado === 'PENDIENTE').length;
        this.completedReportsCount = this.originalReports.filter(r => r.estado === 'COMPLETADO').length;
        
        // Aplicar filtros iniciales
        this.applyFilters();
        
        this.reportsLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar reportes:', err);
        this.reportsError = true;
        this.reportsLoading = false;
      }
    });
  }

  // Transformar reportes
  transformReportes(reportes: any[]): any[] {
    if (!Array.isArray(reportes)) {
      return [];
    }
    
    return reportes.map(reporte => {
      try {
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
        
        // Procesar categorías
        let nombreCategorias: string[] = [];
        let categoryClasses: string[] = [];
        
        if (reporte.categoria && Array.isArray(reporte.categoria)) {
          // Procesar todas las categorías del reporte
          reporte.categoria.forEach((cat: { name: string; descripcion: string; }) => {
            if (cat.name) {
              nombreCategorias.push(cat.name);
            } else if (cat.descripcion) {
              const nombre = this.obtenerNombreCategoria(cat.descripcion);
              nombreCategorias.push(nombre);
            }
          });
        }
        
        // Si no hay categorías, asignar una por defecto
        if (nombreCategorias.length === 0) {
          nombreCategorias = ['General'];
        }
        
        // Obtener las clases CSS para todas las categorías
        categoryClasses = nombreCategorias.map(nombre => this.obtenerClaseCategoria(nombre));
        
        // Mapear estado para consistencia
        let estado = reporte.estado || 'PENDIENTE';
        if (estado.toUpperCase() === 'ESPERA' || estado.toUpperCase() === 'EN_ESPERA' || estado.toUpperCase() === 'EN ESPERA') {
          estado = 'PENDIENTE';
        }
        
        // Obtener nombre de usuario que hizo el reporte
        const userName = reporte.usuario?.nombreCom || 'Usuario ID: ' + reporte.usuarioId;
        
        return {
          id: reporte.id || 'sin-id',
          title: reporte.titulo || 'Sin título',
          address: direccion,
          description: reporte.descripcion || 'Sin descripción',
          generatedTime: tiempoTranscurrido,
          category: nombreCategorias[0], 
          allCategories: nombreCategorias,
          allCategoryClasses: categoryClasses,
          stars: typeof reporte.likes === 'number' ? reporte.likes : 0,
          imageUrl: imageUrl,
          mapId: `map-${reporte.id || Math.random().toString(36).substring(2, 11)}`,
          location: location,
          estado: estado,
          userName: userName,
          usuarioId: reporte.usuarioId
        };
      } catch (error) {
        console.error('Error al transformar reporte:', error, reporte);
        return this.crearReporteDefault();
      }
    });
  }

  // Métodos de acción para administrador
  approveReport(reportId: string): void {
    this.reporteService.updateReportStatus(reportId, 'COMPLETADO').subscribe({
      next: () => {
        // Actualizar estado en el arreglo local
        const report = this.originalReports.find(r => r.id === reportId);
        if (report) {
          report.estado = 'COMPLETADO';
          this.pendingReportsCount--;
          this.completedReportsCount++;
          
          // Enviar notificación a usuarios cercanos
          if (report.location && report.location.lat && report.location.lng) {
            this.notificationService.notificarReportesCercanos(
              reportId, 
              report.location.lat, 
              report.location.lng,
              5 // distancia en km
            ).subscribe({
              next: (response) => console.log('Notificaciones enviadas:', response),
              error: (err) => console.error('Error al enviar notificaciones:', err)
            });
          }
        }
        // Re-aplicar filtros
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error al aprobar reporte:', err);
        alert('No se pudo aprobar el reporte. Intente nuevamente.');
      }
    });
  }
  
  denyReport(reportId: string): void {
    this.reporteService.updateReportStatus(reportId, 'DENEGADO').subscribe({
      next: () => {
        // Actualizar estado en el arreglo local
        const report = this.originalReports.find(r => r.id === reportId);
        if (report) {
          report.estado = 'DENEGADO';
          this.pendingReportsCount--;
        }
        // Re-aplicar filtros
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error al denegar reporte:', err);
        alert('No se pudo denegar el reporte. Intente nuevamente.');
      }
    });
  }
  
  confirmDelete(reportId: string): void {
    this.reportToDelete = reportId;
    this.showDeleteModal = true;
  }
  
  cancelDelete(): void {
    this.reportToDelete = null;
    this.showDeleteModal = false;
  }
  
  deleteReport(): void {
    if (!this.reportToDelete) return;
    
    const reportId = this.reportToDelete;
    this.showDeleteModal = false;
    
    this.reporteService.deleteReporte(reportId).subscribe({
      next: () => {
        // Eliminar del arreglo local
        const reportIndex = this.originalReports.findIndex(r => r.id === reportId);
        if (reportIndex !== -1) {
          const report = this.originalReports[reportIndex];
          if (report.estado === 'PENDIENTE') this.pendingReportsCount--;
          else if (report.estado === 'COMPLETADO') this.completedReportsCount--;
          
          this.originalReports.splice(reportIndex, 1);
        }
        // Re-aplicar filtros
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error al eliminar reporte:', err);
        alert('No se pudo eliminar el reporte. Intente nuevamente.');
      }
    });
  }
  
  // Acciones rápidas
  approveAllPending(): void {
    const pendingReports = this.originalReports.filter(r => r.estado === 'PENDIENTE');
    
    if (pendingReports.length === 0) {
      alert('No hay reportes pendientes para aprobar.');
      return;
    }
    
    if (confirm(`¿Está seguro de aprobar ${pendingReports.length} reportes pendientes?`)) {
      // Implementar lógica para aprobar todos los pendientes
      alert('Funcionalidad en desarrollo');
    }
  }
  
  exportReports(): void {
    // Implementar lógica para exportar reportes
    alert('Exportación de reportes en desarrollo');
  }
  
  refreshData(): void {
    this.loadReports();
    this.loadUserCount();
  }
  
  openSettings(): void {
    this.router.navigate(['/admin/settings']);
  }
  
  openUserManagement(): void {
    this.router.navigate(['/admin/users']);
  }
  
  generateReports(): void {
    this.router.navigate(['/admin/reports']);
  }

  // Métodos para mapas
  clearCurrentMaps(): void {
    this.mapInstances.forEach((map) => {
      map.remove();
    });
    this.mapInstances.clear();
    this.markerInstances.clear();
    this.mapsToInitialize = [];
  }
  
  prepareMapInitialization() {
    this.mapsToInitialize = this.filteredReports
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
        const report = this.filteredReports.find(r => r.mapId === mapId);
        
        if (report && report.location && report.location.lat && report.location.lng) {
          try {
            // Limpiar mapa si ya existía
            if (this.mapInstances.has(mapId)) {
              this.mapInstances.get(mapId)?.remove();
            }
  
            // Optimizado para espacio cuadrado pequeño
            const map = L.map(mapId, {
              center: [report.location.lat, report.location.lng],
              zoom: 16,
              zoomControl: true,
              attributionControl: false,
              dragging: true,
              scrollWheelZoom: true,
              doubleClickZoom: true
            });
            
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
            
            // Incluir la información en el popup
            let popupContent = `<strong>${report.title}</strong><br>${report.address}`;
            
            marker.bindPopup(popupContent);
            
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
              let popupContent = `<strong>${report.title}</strong><br>${address}`;
              marker.setPopupContent(popupContent);
            }
          }
        },
        error: (error) => {
          console.error('Error al obtener la dirección:', error);
        }
      });
    }
  }

  // Métodos auxiliares
  private extractPartialAddress(fullAddress: string): string {
    const parts = fullAddress.split(',');
    return parts.slice(0, 3).join(',').trim();
  }
  
  obtenerNombreCategoria(descripcion: string): string {
    if (!descripcion) return 'General';
    
    if (descripcion.includes('seguridad')) return 'Seguridad';
    if (descripcion.includes('infraestructura')) return 'Infraestructura';
    if (descripcion.includes('medio ambiente')) return 'Medio Ambiente';
    if (descripcion.includes('transporte')) return 'Transporte';
    if (descripcion.includes('servicios públicos')) return 'Servicios';
    
    return 'General';
  }
  
  obtenerClaseCategoria(categoria: string): string {
    const categoriaLowerCase = categoria.toLowerCase();
    
    const mapeoClases: {[key: string]: string} = {
      'seguridad': 'seguridad',
      'infraestructura': 'infraestructura',
      'medio ambiente': 'medio-ambiente',
      'transporte': 'transporte',
      'servicios públicos': 'servicios'
    };
    
    if (mapeoClases[categoriaLowerCase]) {
      return mapeoClases[categoriaLowerCase];
    }
    
    if (categoriaLowerCase.includes('seguri')) return 'seguridad';
    if (categoriaLowerCase.includes('infraestructura')) return 'infraestructura';
    if (categoriaLowerCase.includes('ambiente') || categoriaLowerCase.includes('medio')) return 'medio-ambiente';
    if (categoriaLowerCase.includes('transport')) return 'transporte';
    if (categoriaLowerCase.includes('servicio')) return 'servicios';
    
    return 'servicios';
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
      allCategories: ['Error'],
      allCategoryClasses: ['error'],
      stars: 0,
      imageUrl: 'imagenotfound.png',
      mapId: `map-error-${Math.random().toString(36).substring(2, 11)}`,
      location: { lat: null, lng: null },
      estado: 'Error',
      userName: 'Desconocido'
    };
  }
  
  hideSpinner(event: any): void {
    event.target.classList.add('loaded');
  }

  handleImageError(event: any): void {
    event.target.src = 'imagenotfound.png';
    event.target.classList.add('loaded');
  }
}