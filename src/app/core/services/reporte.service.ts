import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, switchMap, of, throwError } from 'rxjs';
import { AuthService } from './authentication.service';
import { catchError, map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  // URL de la API
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
    return this.http.get(url, { headers }).pipe(
      catchError(error => {
        console.error(`Error al obtener reporte ${id}:`, error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudo cargar el detalle del reporte'
        }));
      })
    );
  }

  updateReporte(id: string, reporteData: any): Observable<any> {
    const url = `${this.apiUrl}/reportes/${id}`;
    const headers = this.getAuthHeaders();
    
    // Asegurar que el ID del usuario esté incluido
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id) {
      reporteData.idUsuario = currentUser.id;
    }
    
    return this.http.put(url, reporteData, { headers }).pipe(
      catchError(error => {
        console.error(`Error al actualizar reporte ${id}:`, error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudo actualizar el reporte'
        }));
      })
    );
  }

  deleteReporte(id: string): Observable<any> {
    const url = `${this.apiUrl}/reportes/${id}`;
    const headers = this.getAuthHeaders();
    return this.http.delete(url, { headers }).pipe(
      catchError(error => {
        console.error(`Error al eliminar reporte ${id}:`, error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudo eliminar el reporte'
        }));
      })
    );
  }

  getAllReportes(): Observable<any[]> {
    const url = `${this.apiUrl}/reportes`;
    const headers = this.getAuthHeaders();
    return this.http.get<any[]>(url, { headers }).pipe(
      tap(reportes => {
        console.log(`Obtenidos ${reportes.length} reportes globales`);
      }),
      catchError(error => {
        console.error('Error al obtener todos los reportes:', error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudieron cargar los reportes'
        }));
      })
    );
  }

  markReporteAsCompleted(id: string): Observable<any> {
    const url = `${this.apiUrl}/reportes/${id}/completar`;
    const headers = this.getAuthHeaders();
    return this.http.put(url, {}, { headers }).pipe(
      catchError(error => {
        console.error(`Error al marcar reporte ${id} como completado:`, error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudo marcar el reporte como completado'
        }));
      })
    );
  }

  markReporteAsDenied(id: string, motivo: string): Observable<any> {
    const url = `${this.apiUrl}/reportes/${id}/denegar`;
    const headers = this.getAuthHeaders();
    return this.http.put(url, { motivo }, { headers }).pipe(
      catchError(error => {
        console.error(`Error al denegar reporte ${id}:`, error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudo denegar el reporte'
        }));
      })
    );
  }

  /**
   * Obtiene los reportes de un usuario específico
   * @param userId ID del usuario
   * @returns Observable con array de reportes
   */
  getUserReports(userId: string): Observable<any[]> {
    const url = `${this.apiUrl}/reportes/user/${userId}`;
    const headers = this.getAuthHeaders();

    console.log(`Buscando reportes del usuario ID: ${userId}`);
    console.log(`URL: ${url}`);
    
    return this.http.get<any[]>(url, { headers }).pipe(
      tap(reportes => {
        console.log(`Reportes obtenidos: ${reportes.length}`);
        if (reportes.length > 0) {
          console.log('Muestra del primer reporte:', {
            id: reportes[0].id,
            titulo: reportes[0].titulo,
            estado: reportes[0].estado
          });
        } else {
          console.log('No se encontraron reportes para este usuario');
        }
      }),
      catchError(error => {
        console.error('Error al obtener reportes del usuario:', error);
        
        let errorMsg = 'Error al cargar reportes';
        if (error.status === 0) {
          errorMsg = 'No se pudo conectar al servidor. Verifique su conexión.';
        } else if (error.status === 401) {
          errorMsg = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
          this.authService.logout();
        } else if (error.error && error.error.detalle) {
          errorMsg = `Error: ${error.error.detalle}`;
        }
        
        // Si hay error, intentamos con el método de respaldo
        console.log('Intentando método alternativo para obtener reportes...');
        return this.getUserReportsFallback(userId);
      })
    );
  }

  /**
   * Método de respaldo que obtiene todos los reportes y filtra por usuario
   * en caso de que el endpoint específico no funcione
   */
  getUserReportsFallback(userId: string): Observable<any[]> {
    console.log(`Usando método de respaldo para obtener reportes de usuario ${userId}`);
    
    return this.getAllReportes().pipe(
      map(allReports => {
        // Filtrar reportes del usuario específico
        const userReports = allReports.filter(report => report.idUsuario === userId);
        console.log(`Filtrados ${userReports.length} reportes del usuario de un total de ${allReports.length}`);
        return userReports;
      }),
      catchError(error => {
        console.error('Error también en el método de respaldo:', error);
        return of([]); // Devolver array vacío en caso de error
      })
    );
  }

  /**
   * Elimina un reporte (alias para mantener compatibilidad)
   */
  deleteReport(reportId: string): Observable<any> {
    return this.deleteReporte(reportId);
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
    
    // Asegurar que el token tenga el formato correcto
    const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': bearerToken
    });
  }
}