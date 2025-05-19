import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'https://seguredapi-919088633053.us-central1.run.app';
  private apiUrlLocal = 'http://localhost:8080';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Obtiene notificaciones de un usuario con opciones de filtrado y paginación
   * @param usuarioId ID del usuario
   * @param leido Opcional - filtrar por estado de lectura
   * @param page Número de página (empieza en 0)
   * @param size Tamaño de página
   * @returns Observable con lista de notificaciones
   */
  getNotificaciones(usuarioId: string, leido?: boolean, page: number = 0, size: number = 10): Observable<any> {
    const url = `${this.apiUrlLocal}/notificaciones/usuario/${usuarioId}`;
    const headers = this.getAuthHeaders();
    
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (leido !== undefined) {
      params = params.set('leido', leido.toString());
    }
    
    console.log(`Obteniendo notificaciones para usuario ID: ${usuarioId}`);
    
    return this.http.get(url, { headers, params }).pipe(
      tap(response => {
        console.log(`Notificaciones obtenidas: ${(response as any).content ? (response as any).content.length : 'formato desconocido'}`);
      }),
      catchError(error => {
        console.error('Error al obtener notificaciones:', error);
        
        let errorMsg = 'Error al cargar notificaciones';
        if (error.status === 0) {
          errorMsg = 'No se pudo conectar al servidor. Verifique su conexión a Internet.';
        } else if (error.status === 401) {
          errorMsg = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
          this.authService.logout();
        }
        
        return throwError(() => ({
          ...error,
          userMessage: errorMsg
        }));
      })
    );
  }

  /**
   * Marca una notificación como leída
   * @param notificacionId ID de la notificación
   * @returns Observable con la respuesta
   */
  marcarComoLeida(notificacionId: string): Observable<any> {
    const url = `${this.apiUrlLocal}/notificaciones/${notificacionId}/leer`;
    const headers = this.getAuthHeaders();
    
    return this.http.put(url, {}, { headers }).pipe(
      catchError(error => {
        console.error(`Error al marcar notificación ${notificacionId} como leída:`, error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudo actualizar el estado de la notificación'
        }));
      })
    );
  }

  /**
   * Obtiene el contador de notificaciones no leídas del usuario
   * @param usuarioId ID del usuario
   * @returns Observable con el contador
   */
  contarNoLeidas(usuarioId: string): Observable<any> {
    const url = `${this.apiUrlLocal}/notificaciones/usuario/${usuarioId}/no-leidas/count`;
    const headers = this.getAuthHeaders();
    
    return this.http.get(url, { headers }).pipe(
      catchError(error => {
        console.error('Error al contar notificaciones no leídas:', error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudo obtener el contador de notificaciones'
        }));
      })
    );
  }

  /**
   * Obtiene reportes cercanos a la ubicación del usuario
   * @param usuarioId ID del usuario
   * @param radioKm Radio en kilómetros para buscar reportes cercanos
   * @returns Observable con la lista de reportes cercanos
   */
  getReportesCercanos(usuarioId: string, radioKm: number = 1.0): Observable<any> {
    const url = `${this.apiUrlLocal}/notificaciones/usuario/${usuarioId}/reportes-cercanos`;
    const headers = this.getAuthHeaders();
    
    let params = new HttpParams().set('radioKm', radioKm.toString());
    
    return this.http.get<any>(url, { headers, params }).pipe(
      tap(response => {
        const reportes = response.reportesCercanos || [];
        console.log(`Reportes cercanos obtenidos: ${reportes.length}`);
      }),
      catchError(error => {
        console.error('Error al obtener reportes cercanos:', error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudieron cargar los reportes cercanos'
        }));
      })
    );
  }

  /**
   * Notifica a usuarios cercanos sobre un nuevo reporte
   * @param reporteId ID del reporte
   * @returns Observable con la respuesta
   */
  notificarUsuariosCercanos(reporteId: string): Observable<any> {
    const url = `${this.apiUrlLocal}/notificaciones/reportes/${reporteId}/notificar-usuarios-cercanos`;
    const headers = this.getAuthHeaders();
    
    return this.http.post(url, {}, { headers }).pipe(
      catchError(error => {
        console.error('Error al notificar usuarios cercanos:', error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudieron notificar a los usuarios cercanos'
        }));
      })
    );
  }

  /**
   * Notifica al creador sobre la aprobación de su reporte
   * @param reporteId ID del reporte
   * @returns Observable con la respuesta
   */
  notificarAprobacionReporte(reporteId: string): Observable<any> {
    const url = `${this.apiUrlLocal}/notificaciones/reportes/${reporteId}/notificar-aprobacion`;
    const headers = this.getAuthHeaders();
    
    return this.http.post(url, {}, { headers }).pipe(
      catchError(error => {
        console.error('Error al notificar aprobación de reporte:', error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudo enviar la notificación de aprobación'
        }));
      })
    );
  }

  /**
   * Obtiene headers con autenticación
   * @private
   * @returns HttpHeaders con token de autenticación
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getAuthToken();
    if (!token) {
      console.warn('No se encontró token de autenticación');
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