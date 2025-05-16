import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router'; // Añadir RouterLink aquí
import { AuthService } from '../../core/services/authentication.service';
import { ReporteService } from '../../core/services/reporte.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [FooterComponent, CommonModule, RouterLink], // Añadir RouterLink aquí también
  standalone: true,
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user: any = null;
  loading = true;
  error = false;
  successMessage: string | null = null;
  
  reports: any[] = [];
  reportsLoading = true;
  reportsError = false;
  apiUrl = 'http://localhost:8080';

  constructor(
    private router: Router, 
    private authService: AuthService,
    private reporteService: ReporteService
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

  loadReports() {
    this.reportsLoading = true;
    this.reportsError = false;
    
    this.reporteService.getAllReportes().subscribe({
      next: (data) => {
        console.log('Reportes obtenidos de la API:', data);
        this.reports = this.transformReportes(data);
        this.reportsLoading = false;
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
        // Usar la URL correcta para obtener la imagen del backend
        imageUrl = `${this.apiUrl}/reportes-imagenes/${reporte.id}/imagen/0`;
      }
      
      // Procesar ubicación - Estructura actual: {lat, lng}
      let direccion = 'Sin ubicación';
      if (reporte.location) {
        if (reporte.location.direccion) {
          direccion = reporte.location.direccion;
        } else if (reporte.location.lat !== undefined && reporte.location.lng !== undefined) {
          direccion = `Lat: ${reporte.location.lat}, Lng: ${reporte.location.lng}`;
        }
      }
      
      // Formato correcto de fecha
      const fechaPublicacion = new Date(reporte.fechaPublicacion);
      const tiempoTranscurrido = this.calcularTiempoTranscurrido(fechaPublicacion);
      
      // Procesar categoría
      let nombreCategoria = 'General';
      let descripcionCategoria = '';
      
      if (reporte.categoria && Array.isArray(reporte.categoria) && reporte.categoria.length > 0) {
        const cat = reporte.categoria[0];
        
        // El campo relevante ahora es descripcion, no name
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
        mapUrl: 'imagenotfound.png',
        estado: reporte.estado || 'Desconocido'
      };
    } catch (error) {
      console.error('Error al transformar reporte:', error, reporte);
      return this.crearReporteDefault();
    }
  });
}

// Método auxiliar para extraer un nombre de categoría legible desde la descripción
obtenerNombreCategoria(descripcion: string): string {
  if (!descripcion) return 'General';
  
  if (descripcion.includes('seguridad')) return 'Seguridad';
  if (descripcion.includes('infraestructura')) return 'Infraestructura';
  if (descripcion.includes('medio ambiente')) return 'Medio Ambiente';
  if (descripcion.includes('transporte')) return 'Transporte';
  if (descripcion.includes('servicios públicos')) return 'Servicios';
  
  return 'General';
}

  // Método para limpiar campos que podrían tener valores extraños (como "image/jpeg")
  limpiarCampo(valor: any): string {
    if (!valor) return '';
    
    // Si el valor parece ser un MIME type, lo consideramos inválido
    if (typeof valor === 'string' && (
      valor.includes('/') || 
      valor === 'image/jpeg' || 
      valor === 'image/png')
    ) {
      return '';
    }
    
    return String(valor);
  }

  // Método para extraer un nombre de categoría desde una descripción
  extraerNombreDesdeDescripcion(descripcion: string): string {
    if (!descripcion) return 'General';
    
    // Extraer palabras clave
    if (descripcion.toLowerCase().includes('seguridad')) return 'Seguridad';
    if (descripcion.toLowerCase().includes('mascota')) return 'Mascotas';
    if (descripcion.toLowerCase().includes('infraestructura')) return 'Infraestructura';
    if (descripcion.toLowerCase().includes('servicio')) return 'Servicios';
    if (descripcion.toLowerCase().includes('ambiente')) return 'Medio Ambiente';
    if (descripcion.toLowerCase().includes('comun')) return 'Comunidad';
    
    // Si no se encuentra una categoría específica
    return 'General';
  }

  // Crear un reporte default para casos de error
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
      mapUrl: 'imagenotfound.png',
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
}