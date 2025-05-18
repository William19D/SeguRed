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

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [FooterComponent, CommonModule, RouterLink, FormsModule],
  standalone: true,
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewChecked {
  // Propiedades existentes
  user: any = null;
  loading = true;
  error = false;
  successMessage: string | null = null;
  
  reports: any[] = [];
  reportsLoading = true;
  reportsError = false;
  apiUrl = 'https://seguredapi-919088633053.us-central1.run.app';
  mapsToInitialize: string[] = [];
  mapInstances: Map<string, L.Map> = new Map();
  markerInstances: Map<string, L.Marker> = new Map();
  currentUserLocation: { lat: number; lng: number } | null = null;
  locationError: string | null = null;
  userAddress: string | null = null;
  // Nuevas propiedades para búsqueda y filtros
  searchTerm: string = '';
  filteredReports: any[] = [];
  originalReports: any[] = [];
  
  // Propiedades para filtros de categoría - todos desactivados por defecto
  // Propiedades para filtros de categoría - solo las categorías especificadas
categoryFilters: { [key: string]: boolean } = {
  'seguridad': true,
  'infraestructura': true,
  'medio-ambiente': true,
  'transporte': true,
  'servicios': true
};
  
  // Propiedades para filtros de estado - todos activados por defecto
  
  // Propiedad para ordenamiento
  sortBy: string = 'distance'; // Valor por defecto

  constructor(
    private router: Router, 
    private authService: AuthService,
    private reporteService: ReporteService,
    private nominatimService: NominatimService,
    private locationService: LocationService
  ) {}

  ngOnInit() {
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Obtener ubicación actual del usuario
    this.getUserLocation();

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

  // Métodos para búsqueda y filtrado
  searchReports(): void {
    this.applyFilters();
  }
  
  updateSearchTerm(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.searchReports();
  }
  
  updateSortBy(event: Event): void {
    this.sortBy = (event.target as HTMLSelectElement).value;
    this.sortReports();
  }
  
toggleCategoryFilter(category: string): void {
  // Invertir el valor actual
  this.categoryFilters[category] = !this.categoryFilters[category];
  
  // Aplicar los filtros después del cambio
  console.log(`Filtro de categoría "${category}" cambiado a: ${this.categoryFilters[category]}`);
  this.applyFilters();
}

applyFilters(): void {
  console.log("Aplicando filtros...");
  
  // Comenzar con todos los reportes
  let filtered = [...this.originalReports];
  
  // Aplicar filtro de búsqueda por texto
  if (this.searchTerm.trim()) {
    const search = this.searchTerm.toLowerCase().trim();
    filtered = filtered.filter(report => 
      report.title?.toLowerCase().includes(search) || 
      report.description?.toLowerCase().includes(search) ||
      report.address?.toLowerCase().includes(search) ||
      report.allCategories?.some((cat: string) => cat.toLowerCase().includes(search))
    );
  }
  
  // Aplicar filtros de categoría SOLO si hay alguno seleccionado
  const selectedCategories = Object.keys(this.categoryFilters)
    .filter(key => this.categoryFilters[key]);
  
  if (selectedCategories.length > 0) {
    console.log("Categorías seleccionadas:", selectedCategories);
    
    filtered = filtered.filter(report => {
      // El reporte se muestra si alguna de sus categorías está en los filtros seleccionados
      const match = report.allCategoryClasses?.some((cls: string) => selectedCategories.includes(cls));
      console.log(`Reporte "${report.title}" - Categorías: ${report.allCategories?.join(', ')} - Clases: ${report.allCategoryClasses?.join(', ')} -> Coincide: ${match}`);
      return match;
    });
  }
  
  // Actualizar los reportes filtrados
  this.filteredReports = filtered;
  
  // Aplicar ordenamiento
  this.sortReports();

  // Limpiar mapas existentes antes de inicializar nuevos
  this.clearCurrentMaps();

  // Programar inicialización de mapas después de renderizar
  setTimeout(() => {
    if (this.filteredReports.length > 0) {
      this.prepareMapInitialization();
    }
  }, 100);
}
  
  // Limpiar mapas existentes
  clearCurrentMaps(): void {
    // Eliminar todas las instancias de mapas actuales
    this.mapInstances.forEach((map, id) => {
      map.remove();
    });
    this.mapInstances.clear();
    this.markerInstances.clear();
    this.mapsToInitialize = [];
  }
  
  sortReports(): void {
    switch (this.sortBy) {
      case 'distance':
        this.filteredReports.sort((a, b) => {
          // Convertir distancias a números para comparación
          const distA = this.parseDistance(a.distance);
          const distB = this.parseDistance(b.distance);
          return distA - distB;
        });
        break;
        
      case 'date':
        this.filteredReports.sort((a, b) => {
          // Primero extraer el tiempo transcurrido
          const timeA = this.extractTimeValue(a.generatedTime);
          const timeB = this.extractTimeValue(b.generatedTime);
          return timeA - timeB;
        });
        break;
        
      case 'category':
        this.filteredReports.sort((a, b) => {
          return a.category.localeCompare(b.category);
        });
        break;
    }
  }
  
  // Método para convertir distancias textuales a valores numéricos
  parseDistance(distanceText: string): number {
    if (!distanceText || distanceText === 'Ubicación no disponible' || distanceText === 'Distancia desconocida' || distanceText === 'Calculando...') {
      return Infinity; // Poner al final de la lista
    }
    
    // Extraer el número de la cadena
    const match = distanceText.match(/^(\d+\.?\d*)(?:m|km)$/);
    if (!match) return Infinity;
    
    const value = parseFloat(match[1]);
    
    // Convertir metros a kilómetros si es necesario
    if (distanceText.endsWith('m')) {
      return value / 1000;
    }
    
    return value; // Ya está en kilómetros
  }
  
  // Método para extraer el tiempo transcurrido como valor numérico
  extractTimeValue(timeText: string): number {
    if (!timeText || timeText === 'Fecha desconocida' || timeText === 'Fecha futura') {
      return Infinity;
    }
    
    const match = timeText.match(/hace (\d+) (?:minuto|minutos|hora|horas|día|días)/);
    if (!match) return Infinity;
    
    const value = parseInt(match[1], 10);
    
    if (timeText.includes('minuto')) {
      return value;
    } else if (timeText.includes('hora')) {
      return value * 60;
    } else if (timeText.includes('día')) {
      return value * 1440;
    }
    
    return Infinity;
  }
  
  // Método para resetear todos los filtros
  // Método para resetear todos los filtros
resetFilters(): void {
  this.searchTerm = '';
  
  // Resetear filtros de categoría - todos a true para mostrar todos
  Object.keys(this.categoryFilters).forEach(key => {
    this.categoryFilters[key] = true;
  });
  
  // Ya no hay que resetear statusFilters
  
  // Resetear ordenamiento
  this.sortBy = 'distance';
  
  // Aplicar filtros (mostrar todos)
  this.applyFilters();
}
// Método para formatear la dirección del usuario de forma más amigable
private formatUserAddress(fullAddress: string): string {
  if (!fullAddress) return 'Ubicación desconocida';
  
  const parts = fullAddress.split(',').map(part => part.trim());
  
  // Estrategia mejorada para extraer partes significativas
  // Para direcciones latinoamericanas o españolas
  if (parts.length >= 4) {
    // Primer elemento suele ser calle/número
    const street = parts[0];
    
    // Buscar la ciudad o municipio (suele estar en los primeros 3 segmentos)
    let city = '';
    for (let i = 1; i < Math.min(parts.length, 4); i++) {
      if (parts[i] && parts[i].length > 1) {
        city = parts[i];
        break;
      }
    }
    
    // Tomar estado o provincia (suele estar en penúltima posición)
    const state = parts.length > 2 ? parts[parts.length - 2] : '';
    
    // Construir dirección concisa
    let formattedAddress = street;
    if (city) formattedAddress += ', ' + city;
    if (state && state !== city) formattedAddress += ', ' + state;
    
    return formattedAddress;
  }
  
  // Si la dirección es corta o no se pudo procesar, mostrar los primeros 2-3 segmentos
  return parts.slice(0, 3).join(', ');
}
  // Método para obtener la ubicación actual del usuario
getUserLocation() {
  this.locationError = null;
  this.userAddress = null;
  console.log('Iniciando obtención de ubicación');
  
  this.locationService.getCurrentLocation()
    .then(location => {
      console.log('Ubicación obtenida:', location);
      this.currentUserLocation = location;
      
      // Obtener la dirección para esta ubicación
      this.nominatimService.reverseGeocode(location.lat, location.lng).subscribe({
        next: (response) => {
          console.log('Respuesta de Nominatim:', response);
          if (response && response.display_name) {
            // Extraer una dirección legible
            this.userAddress = this.formatUserAddress(response.display_name);
            console.log('Dirección formateada:', this.userAddress);
          } else {
            this.userAddress = 'Dirección no disponible';
            console.log('No se encontró display_name en la respuesta');
          }
        },
        error: (error) => {
          console.error('Error al obtener la dirección del usuario:', error);
          this.userAddress = 'No se pudo determinar la dirección';
        }
      });
      
      // Si ya tenemos reportes cargados, actualizar las distancias
      if (this.originalReports.length > 0) {
        this.updateReportsWithDistance();
        this.applyFilters(); // Reaplica los filtros para actualizar las distancias mostradas
      }
    })
    .catch(error => {
      console.error('Error al obtener ubicación:', error);
      this.locationError = 'No se pudo obtener tu ubicación. Verifica los permisos del navegador.';
    });
}

  ngAfterViewChecked() {
    // Inicializar mapas pendientes
    if (this.mapsToInitialize.length > 0) {
      this.initMaps();
    }
  }

  // Sobrescribir loadReports para guardar reportes originales
loadReports() {
  this.reportsLoading = true;
  this.reportsError = false;
  
  this.reporteService.getAllReportes().subscribe({
    next: (data) => {
      console.log('Reportes obtenidos de la API:', data);
      
      // Filtrar reportes: solo mostrar aquellos con estado COMPLETADO/APROBADO
      const filteredData = data.filter((reporte: any) => {
        const estado = (reporte.estado || '').toUpperCase();
        // Primero eliminar los reportes eliminados
        if (estado === 'ELIMINADO' || estado === 'DELETED') {
          return false;
        }
        
        // Solo mantener los reportes con estado COMPLETADO/APROBADO
        return estado === 'COMPLETADO' || estado === 'APROBADO';
      });
      
      console.log(`Se muestran ${filteredData.length} reportes aprobados de ${data.length} totales`);
      
      this.originalReports = this.transformReportes(filteredData);
      
      // Simplemente asignar todos los reportes a filtered sin filtrar inicialmente
      this.filteredReports = [...this.originalReports];
      
      // Si ya tenemos la ubicación del usuario, calcular distancias
      if (this.currentUserLocation) {
        this.updateReportsWithDistance();
      }
      
      this.reportsLoading = false;
      
      // Ordenar por la opción predeterminada
      this.sortReports();
      
      // Programar inicialización de mapas después de renderizar
      setTimeout(() => {
        if (this.filteredReports.length > 0) {
          this.prepareMapInitialization();
        }
      }, 100);
    },
    error: (err) => {
      console.error('Error al cargar reportes:', err);
      this.reportsError = true;
      this.reportsLoading = false;
    }
  });
}

  // Método para actualizar los reportes con la distancia desde la ubicación actual
  updateReportsWithDistance() {
    if (!this.currentUserLocation) return;
    
    // Crear una constante local para capturar el valor no nulo
    const userLocation = this.currentUserLocation;
    
    this.originalReports.forEach(report => {
      if (report.location && report.location.lat && report.location.lng) {
        const distance = this.calculateDistance(
          userLocation.lat,
          userLocation.lng,
          report.location.lat,
          report.location.lng
        );
        
        // Actualizar la propiedad distance del reporte con un formato legible
        report.distance = this.formatDistance(distance);
      } else {
        report.distance = 'Distancia desconocida';
      }
    });

    // También actualizar las distancias en los reportes filtrados
    this.filteredReports = [...this.originalReports];
    
    // Re-aplicar el ordenamiento
    this.sortReports();
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

  transformReportes(reportes: any[]): any[] {
  if (!Array.isArray(reportes)) {
    console.error('Los datos recibidos no son un array:', reportes);
    return [];
  }
  
  // Log para depuración - muestra los primeros reportes con sus categorías
  if (reportes.length > 0) {
    console.log('Estructura de categoría en primer reporte:', 
      JSON.stringify(reportes[0].categoria));
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
      
      // Procesar categorías - NUEVO: extraer todas las categorías del reporte
      let nombreCategorias: string[] = [];
      let descripcionCategorias: string[] = [];
      let categoryClasses: string[] = [];
      
      if (reporte.categoria && Array.isArray(reporte.categoria)) {
        // Procesar todas las categorías del reporte
        reporte.categoria.forEach((cat: { name: string; descripcion: string; }) => {
          if (cat.name) {
            nombreCategorias.push(cat.name);
            descripcionCategorias.push(cat.descripcion || '');
          } else if (cat.descripcion) {
            const nombre = this.obtenerNombreCategoria(cat.descripcion);
            nombreCategorias.push(nombre);
            descripcionCategorias.push(cat.descripcion);
          }
        });
      }
      
      // Si no hay categorías, asignar una por defecto
      if (nombreCategorias.length === 0) {
        nombreCategorias = ['General'];
        descripcionCategorias = [''];
      }
      
      // Obtener las clases CSS para todas las categorías
      categoryClasses = nombreCategorias.map(nombre => this.obtenerClaseCategoria(nombre));
      
      console.log(`Reporte ${reporte.id}: Categorías: ${nombreCategorias.join(', ')} -> Clases: ${categoryClasses.join(', ')}`);
      
      // Inicializar la distancia como "Calculando..." - se actualizará después
      const distanceText = this.currentUserLocation ? 'Calculando...' : 'Ubicación no disponible';
      
      // Mapear estado para consistencia
      let estado = reporte.estado || 'Desconocido';
      if (estado.toUpperCase() === 'ESPERA' || estado.toUpperCase() === 'EN_ESPERA' || estado.toUpperCase() === 'EN ESPERA') {
        estado = 'PENDIENTE';
      }
      
      return {
        id: reporte.id || 'sin-id',
        title: reporte.titulo || 'Sin título',
        distance: distanceText,
        address: direccion,
        description: reporte.descripcion || 'Sin descripción',
        generatedTime: tiempoTranscurrido,
        // Usar la primera categoría como categoría principal para mostrar
        category: nombreCategorias[0], 
        categoryDescription: descripcionCategorias[0],
        categoryClass: categoryClasses[0],
        // Guardar todas las categorías para filtrado
        allCategories: nombreCategorias,
        allCategoryClasses: categoryClasses,
        stars: typeof reporte.likes === 'number' ? reporte.likes : 0,
        imageUrl: imageUrl,
        mapId: `map-${reporte.id || Math.random().toString(36).substring(2, 11)}`,
        location: location,
        estado: estado
      };
    } catch (error) {
      console.error('Error al transformar reporte:', error, reporte);
      return this.crearReporteDefault();
    }
  });
}

  prepareMapInitialization() {
    // Recopilar todos los reportes con coordenadas válidas de los reportes filtrados
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
              zoom: 16, // Mayor zoom para espacio reducido
              zoomControl: true, // Activamos controles por defecto
              attributionControl: true,
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
            
            // Incluir la distancia en el popup si está disponible
            let popupContent = `<strong>${report.title}</strong><br>${report.address}`;
            if (report.distance && report.distance !== 'Calculando...' && report.distance !== 'Ubicación no disponible') {
              popupContent += `<br><span style="color: #4285f4;">A ${report.distance} de tu ubicación</span>`;
            }
            
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
            
            // Actualizar el popup del marcador con la nueva dirección y distancia
            const marker = this.markerInstances.get(report.mapId);
            if (marker) {
              let popupContent = `<strong>${report.title}</strong><br>${address}`;
              if (report.distance && report.distance !== 'Calculando...' && report.distance !== 'Ubicación no disponible') {
                popupContent += `<br><span style="color: #4285f4;">A ${report.distance} de tu ubicación</span>`;
              }
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
    allCategories: ['Error'],
    allCategoryClasses: ['error'],
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
  // Normalizar la categoría a minúsculas
  const categoriaLowerCase = categoria.toLowerCase();
  
  // Mapeo exacto para las categorías específicas que queremos
  const mapeoClases: {[key: string]: string} = {
    'seguridad': 'seguridad',
    'infraestructura': 'infraestructura',
    'medio ambiente': 'medio-ambiente',
    'transporte': 'transporte',  // Ahora transporte tiene su propia clase
    'servicios públicos': 'servicios'
  };
  
  // Primero, intentar un mapeo exacto
  if (mapeoClases[categoriaLowerCase]) {
    return mapeoClases[categoriaLowerCase];
  }
  
  // Si no hay mapeo exacto, usar comparaciones parciales
  if (categoriaLowerCase.includes('seguri')) return 'seguridad';
  if (categoriaLowerCase.includes('infraestructura')) return 'infraestructura';
  if (categoriaLowerCase.includes('ambiente') || categoriaLowerCase.includes('medio')) return 'medio-ambiente';
  if (categoriaLowerCase.includes('transport')) return 'transporte'; // Mapear a transporte
  if (categoriaLowerCase.includes('servicio')) return 'servicios';
  
  // Por defecto, asignar a la categoría más cercana
  return 'servicios'; // Por defecto asignar a servicios
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