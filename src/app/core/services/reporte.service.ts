import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
// Actualiza esta línea para incluir throwError
import { Observable, switchMap, of, throwError } from 'rxjs';
import { AuthService } from './authentication.service';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  // URL fija de la API según lo solicitado
  private apiUrl = 'https://seguredapi-919088633053.us-central1.run.app';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  createReporte(reporteData: any): Observable<any> {
    // Obtener información del usuario actual
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser && currentUser.id) {
      // Si ya tenemos los datos del usuario en localStorage, usamos esos
      reporteData.idUsuario = currentUser.id;
      console.log('ID de usuario obtenido de localStorage:', currentUser.id);
      return this.sendReporteRequest(reporteData);
    } else {
      // Si no tenemos los datos, intentamos obtenerlos del backend primero
      console.log('Obteniendo información del usuario desde el servidor...');
      return this.authService.getUserInfo().pipe(
        switchMap(userData => {
          if (userData && userData.id) {
            reporteData.idUsuario = userData.id;
            console.log('ID de usuario obtenido del servidor:', userData.id);
          } else {
            console.warn('No se pudo obtener ID de usuario, continuando sin él');
          }
          return this.sendReporteRequest(reporteData);
        }),
        catchError(error => {
          console.error('Error al obtener información del usuario:', error);
          // Intentar enviar el reporte de todos modos
          return this.sendReporteRequest(reporteData);
        })
      );
    }
  }

  private sendReporteRequest(reporteData: any): Observable<any> {
  const url = `${this.apiUrl}/reportes`;
  const headers = this.getAuthHeaders();
  
  console.log('Enviando reporte a:', url);
  
  // Limitar el logging para no llenar la consola
  const reporteDataLog = {
    ...reporteData,
    imagenes: reporteData.imagenes ? 
      `[${reporteData.imagenes.length} imágenes]` : 'ninguna'
  };
  console.log('Datos del reporte:', reporteDataLog);
  
  return this.http.post(url, reporteData, { headers })
    .pipe(
      catchError(error => {
        console.error('Error en la solicitud HTTP:', error);
        
        // Intentar proporcionar información más útil sobre el error
        let errorMsg = 'Error al enviar el reporte';
        
        if (error.error && error.error.message) {
          errorMsg = `Error del servidor: ${error.error.message}`;
        } else if (error.status === 0) {
          errorMsg = 'No se pudo conectar al servidor. Verifique su conexión a Internet.';
        } else if (error.status === 400) {
          errorMsg = 'Datos de reporte incorrectos. Verifique e intente de nuevo.';
        } else if (error.status === 413) {
          errorMsg = 'El tamaño del reporte es demasiado grande. Intente con menos imágenes o de menor tamaño.';
        }
        
        // Devolver un observable con el error mejorado
        return throwError(() => {
          return {
            ...error,
            userMessage: errorMsg
          };
        });
      })
    );
}

  getReporteById(id: string): Observable<any> {
    const url = `${this.apiUrl}/reportes/${id}`;
    const headers = this.getAuthHeaders();
    return this.http.get(url, { headers });
  }

  updateReporte(id: string, reporteData: any): Observable<any> {
    const url = `${this.apiUrl}/reportes/${id}`;
    const headers = this.getAuthHeaders();
    
    // Asegurar que el ID del usuario esté incluido
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id) {
      reporteData.idUsuario = currentUser.id;
    }
    
    return this.http.put(url, reporteData, { headers });
  }

  deleteReporte(id: string): Observable<any> {
    const url = `${this.apiUrl}/reportes/${id}`;
    const headers = this.getAuthHeaders();
    return this.http.delete(url, { headers });
  }

  getAllReportes(): Observable<any> {
    const url = `${this.apiUrl}/reportes`;
    const headers = this.getAuthHeaders();
    return this.http.get(url, { headers });
  }

  markReporteAsCompleted(id: string): Observable<any> {
    const url = `${this.apiUrl}/reportes/${id}/completar`;
    const headers = this.getAuthHeaders();
    return this.http.put(url, {}, { headers });
  }

  markReporteAsDenied(id: string, motivo: string): Observable<any> {
    const url = `${this.apiUrl}/reportes/${id}/denegar`;
    const headers = this.getAuthHeaders();
    return this.http.put(url, { motivo }, { headers });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getAuthToken();
    if (!token) {
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }
    
    // Asegurar que el token tenga el formato correcto
    const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': bearerToken
    });
  }
}