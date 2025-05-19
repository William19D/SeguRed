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

  markReporteAsDenied(id: string, motivo: string = ''): Observable<any> {
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
   * Método genérico para actualizar el estado de un reporte
   * @param id ID del reporte
   * @param status Nuevo estado (PENDIENTE, COMPLETADO, DENEGADO)
   * @returns Observable con la respuesta
   */
  updateReportStatus(id: string, status: string): Observable<any> {
    // Validar el estado
    const validStatuses = ['PENDIENTE', 'COMPLETADO', 'DENEGADO'];
    if (!validStatuses.includes(status)) {
      return throwError(() => ({
        userMessage: `Estado "${status}" no válido. Debe ser uno de: ${validStatuses.join(', ')}`
      }));
    }

    // Usar los métodos específicos según el estado
    if (status === 'COMPLETADO') {
      return this.markReporteAsCompleted(id);
    } else if (status === 'DENEGADO') {
      return this.markReporteAsDenied(id);
    } else {
      // Para otros estados, usar el método general de actualización
      return this.updateReporte(id, { estado: status });
    }
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
   * Obtiene estadísticas de reportes para el panel de administración
   * @returns Observable con estadísticas de reportes
   */
  getReportStatistics(): Observable<any> {
    return this.getAllReportes().pipe(
      map(reports => {
        const pendingReports = reports.filter(r => r.estado === 'PENDIENTE' || r.estado === 'EN_ESPERA');
        const completedReports = reports.filter(r => r.estado === 'COMPLETADO');
        const deniedReports = reports.filter(r => r.estado === 'DENEGADO');

        return {
          total: reports.length,
          pending: pendingReports.length,
          completed: completedReports.length,
          denied: deniedReports.length,
          byCategory: this.getReportsByCategory(reports)
        };
      }),
      catchError(error => {
        console.error('Error al obtener estadísticas:', error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudieron cargar las estadísticas'
        }));
      })
    );
  }

  /**
   * Método auxiliar para agrupar reportes por categoría
   */
  private getReportsByCategory(reports: any[]): {[key: string]: number} {
    const categories: {[key: string]: number} = {};
    
    reports.forEach(report => {
      if (report.categoria && Array.isArray(report.categoria)) {
        report.categoria.forEach((cat: any) => {
          const catName = cat.name || this.getCategoryNameFromDescription(cat.descripcion);
          if (catName) {
            categories[catName] = (categories[catName] || 0) + 1;
          }
        });
      }
    });
    
    return categories;
  }

  /**
   * Extraer nombre de categoría a partir de descripción
   */
  private getCategoryNameFromDescription(descripcion: string): string {
    if (!descripcion) return 'General';
    
    if (descripcion.includes('seguridad')) return 'Seguridad';
    if (descripcion.includes('infraestructura')) return 'Infraestructura';
    if (descripcion.includes('medio ambiente')) return 'Medio Ambiente';
    if (descripcion.includes('transporte')) return 'Transporte';
    if (descripcion.includes('servicios públicos')) return 'Servicios';
    
    return 'General';
  }

  /**
   * Exporta reportes a formato CSV
   * @returns String con datos en formato CSV
   */
  exportReportsToCSV(): Observable<string> {
    return this.getAllReportes().pipe(
      map(reports => {
        // Definir las columnas del CSV
        const headers = [
          'ID', 'Título', 'Descripción', 'Estado', 
          'Categoría', 'Fecha Publicación', 'Likes',
          'ID Usuario', 'Dirección', 'Latitud', 'Longitud'
        ];

        // Crear filas de datos
        const rows = reports.map(report => [
          report.id || '',
          `"${(report.titulo || '').replace(/"/g, '""')}"`,
          `"${(report.descripcion || '').replace(/"/g, '""')}"`,
          report.estado || '',
          report.categoria && Array.isArray(report.categoria) ? 
            `"${report.categoria.map((c: any) => c.name || '').join(', ')}"` : '',
          report.fechaPublicacion || '',
          report.likes || '0',
          report.usuarioId || '',
          `"${(report.direccion || '').replace(/"/g, '""')}"`,
          report.locations?.lat || '',
          report.locations?.lng || ''
        ]);

        // Combinar encabezados y filas
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.join(','))
        ].join('\n');

        return csvContent;
      }),
      catchError(error => {
        console.error('Error al exportar reportes a CSV:', error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudieron exportar los reportes'
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
    
    // Asegurar que el token tenga el formato correcto
    const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': bearerToken
    });
  }

  /**
   * Añade un like a un reporte
   * @param reporteId ID del reporte
   * @param userId ID del usuario que da like
   * @returns Observable con la respuesta
   */
  addLike(reporteId: string, userId: string): Observable<any> {
    const url = `${this.apiUrl}/reportes/${reporteId}/like`;
    const headers = this.getAuthHeaders();
    
    console.log(`Añadiendo like al reporte ${reporteId} por usuario ${userId}`);
    
    return this.http.post(url, { userId }, { headers }).pipe(
      tap(() => {
        console.log('Like añadido con éxito');
      }),
      catchError(error => {
        console.error('Error al añadir like:', error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudo dar like al reporte'
        }));
      })
    );
  }

  /**
   * Elimina un like de un reporte
   * @param reporteId ID del reporte
   * @param userId ID del usuario que quita el like
   * @returns Observable con la respuesta
   */
  removeLike(reporteId: string, userId: string): Observable<any> {
    const url = `${this.apiUrl}/reportes/${reporteId}/like/${userId}`;
    const headers = this.getAuthHeaders();
    
    console.log(`Eliminando like del reporte ${reporteId} por usuario ${userId}`);
    
    return this.http.delete(url, { headers }).pipe(
      tap(() => {
        console.log('Like eliminado con éxito');
      }),
      catchError(error => {
        console.error('Error al eliminar like:', error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudo quitar el like del reporte'
        }));
      })
    );
  }

  /**
   * Añade un comentario a un reporte
   * @param reporteId ID del reporte
   * @param comentarioData Datos del comentario
   * @returns Observable con la respuesta
   */
  addComentario(reporteId: string, comentarioData: any): Observable<any> {
    const url = `${this.apiUrl}/reportes/${reporteId}/comentarios`;
    const headers = this.getAuthHeaders();
    
    console.log(`Añadiendo comentario al reporte ${reporteId}`);
    
    return this.http.post(url, comentarioData, { headers }).pipe(
      tap(() => {
        console.log('Comentario añadido con éxito');
      }),
      catchError(error => {
        console.error('Error al añadir comentario:', error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudo añadir el comentario al reporte'
        }));
      })
    );
  }

  /**
   * Obtiene los comentarios de un reporte
   * @param reporteId ID del reporte
   * @returns Observable con array de comentarios
   */
  getComentarios(reporteId: string): Observable<any[]> {
    const url = `${this.apiUrl}/reportes/${reporteId}/comentarios`;
    const headers = this.getAuthHeaders();
    
    return this.http.get<any[]>(url, { headers }).pipe(
      tap(comentarios => {
        console.log(`Obtenidos ${comentarios.length} comentarios para el reporte ${reporteId}`);
      }),
      catchError(error => {
        console.error('Error al obtener comentarios:', error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudieron cargar los comentarios'
        }));
      })
    );
  }

  /**
   * Elimina un comentario de un reporte
   * @param reporteId ID del reporte
   * @param comentarioId ID del comentario
   * @returns Observable con la respuesta
   */
  deleteComentario(reporteId: string, comentarioId: string): Observable<any> {
    const url = `${this.apiUrl}/reportes/${reporteId}/comentarios/${comentarioId}`;
    const headers = this.getAuthHeaders();
    
    console.log(`Eliminando comentario ${comentarioId} del reporte ${reporteId}`);
    
    return this.http.delete(url, { headers }).pipe(
      tap(() => {
        console.log('Comentario eliminado con éxito');
      }),
      catchError(error => {
        console.error('Error al eliminar comentario:', error);
        return throwError(() => ({
          ...error,
          userMessage: 'No se pudo eliminar el comentario'
        }));
      })
    );
  }

  /**
   * Verifica si un usuario ha dado like a un reporte
   * @param reporteId ID del reporte
   * @param userId ID del usuario
   * @returns Observable con boolean (true si el usuario ha dado like)
   */
  checkUserLiked(reporteId: string, userId: string): Observable<boolean> {
    return this.getReporteById(reporteId).pipe(
      map(report => {
        if (!report.usersLiked || !Array.isArray(report.usersLiked)) {
          return false;
        }
        return report.usersLiked.includes(userId);
      }),
      catchError(error => {
        console.error('Error al verificar like del usuario:', error);
        return of(false);
      })
    );
  }
  // Métodos para likes/dislikes de comentarios
addComentarioLike(reporteId: string, comentarioId: string, userId: string): Observable<any> {
  const url = `${this.apiUrl}/reportes/${reporteId}/comentarios/${comentarioId}/like`;
  const headers = this.getAuthHeaders();
  
  return this.http.post(url, { userId }, { headers }).pipe(
    catchError(error => {
      console.error('Error al dar like a comentario:', error);
      return throwError(() => ({
        ...error,
        userMessage: 'No se pudo dar like al comentario'
      }));
    })
  );
}

removeComentarioLike(reporteId: string, comentarioId: string, userId: string): Observable<any> {
  const url = `${this.apiUrl}/reportes/${reporteId}/comentarios/${comentarioId}/like/${userId}`;
  const headers = this.getAuthHeaders();
  
  return this.http.delete(url, { headers }).pipe(
    catchError(error => {
      console.error('Error al quitar like de comentario:', error);
      return throwError(() => ({
        ...error,
        userMessage: 'No se pudo quitar el like del comentario'
      }));
    })
  );
}

addComentarioDislike(reporteId: string, comentarioId: string, userId: string): Observable<any> {
  const url = `${this.apiUrl}/reportes/${reporteId}/comentarios/${comentarioId}/dislike`;
  const headers = this.getAuthHeaders();
  
  return this.http.post(url, { userId }, { headers }).pipe(
    catchError(error => {
      console.error('Error al dar dislike a comentario:', error);
      return throwError(() => ({
        ...error,
        userMessage: 'No se pudo dar dislike al comentario'
      }));
    })
  );
}

removeComentarioDislike(reporteId: string, comentarioId: string, userId: string): Observable<any> {
  const url = `${this.apiUrl}/reportes/${reporteId}/comentarios/${comentarioId}/dislike/${userId}`;
  const headers = this.getAuthHeaders();
  
  return this.http.delete(url, { headers }).pipe(
    catchError(error => {
      console.error('Error al quitar dislike de comentario:', error);
      return throwError(() => ({
        ...error,
        userMessage: 'No se pudo quitar el dislike del comentario'
      }));
    })
  );
}
}