import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './authentication.service';

export interface Location {
  lat: number;
  lng: number;
}

export interface ReporteRequest {
  id?: string;
  usuarioId?: string;
  creadorAnuncio: string;
  titulo: string;
  descripcion: string;
  ubicacion: string;
  categoria: string;
  locations: Location[];
}

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private apiUrl = 'localhost:8080/reportes';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  crearReporte(reporte: ReporteRequest): Observable<any> {
    const token = this.authService.getAuthToken();
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }

    const headers = new HttpHeaders({
      'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(this.apiUrl, reporte, { headers });
  }
}