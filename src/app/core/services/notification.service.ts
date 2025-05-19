import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { AuthService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Cambiar para usar la URL de producción en lugar de la local por defecto
  private apiUrl = 'https://seguredapi-919088633053.us-central1.run.app';
  private localUrl = 'http://localhost:8080';
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Obtiene notificaciones de un usuario con opciones de filtrado y paginación
   */
  getNotificaciones(usuarioId: string, leido?: boolean, page: number = 0, size: number = 10): Observable<any> {
    const url = `${this.localUrl}/notificacion/usuario/${usuarioId}`;
    const headers = this.getAuthHeaders();
    
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (leido !== undefined) {
      params = params.set('leido', leido.toString());
    }
    
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
   */
  marcarComoLeida(notificacionId: string): Observable<any> {
    const url = `${this.localUrl}/notificacion/${notificacionId}/leer`;
    const headers = this.getAuthHeaders();
    
    return this.http.patch(url, {}, { headers }).pipe(
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
   * Marca todas las notificaciones de un usuario como leídas
   */
  marcarTodasComoLeidas(usuarioId: string): Observable<any> {
    const url = `${this.localUrl}/notificacion/usuario/${usuarioId}/leer-todas`;
    const headers = this.getAuthHeaders();
    
    return this.http.patch(url, {}, { headers }).pipe(
      catchError(error => {
        console.error(`Error al marcar todas las notificaciones como leídas:`, error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudieron actualizar las notificaciones'
        }));
      })
    );
  }

  /**
   * Obtiene el contador de notificaciones no leídas del usuario
   */
  contarNoLeidas(usuarioId: string): Observable<any> {
    const url = `${this.localUrl}/notificacion/usuario/${usuarioId}`;
    const headers = this.getAuthHeaders();
    const params = new HttpParams()
      .set('leido', 'false')
      .set('page', '0')
      .set('size', '1');
    
    return this.http.get(url, { headers, params }).pipe(
      map((response: any) => {
        return { count: response.totalElements || 0 };
      }),
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
   * Notificar reportes cercanos (solo admin)
   */
  notificarReportesCercanos(reporteId: string, latitud: number, longitud: number, distanciaMaximaKm: number = 5): Observable<any> {
    const url = `${this.localUrl}/notificacion/reportes-cercanos`;
    const headers = this.getAuthHeaders();
    const body = {
      reporteId,
      latitud,
      longitud,
      distanciaMaximaKm
    };
    
    return this.http.post(url, body, { headers }).pipe(
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
   * Obtiene headers con autenticación
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getAuthToken();
    if (!token) {
      console.warn('No se encontró token de autenticación');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }
    
    const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': bearerToken
    });
  }
}