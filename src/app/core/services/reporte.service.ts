import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private apiUrl = 'https://seguredapi-919088633053.us-central1.run.app/reportes';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  createReporte(reporteData: any): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post(this.apiUrl, reporteData, { headers });
  }

  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const headers = this.authService.getAuthHeaders();
    // Assuming your API has an endpoint for image uploads
    return this.http.post(`${this.apiUrl}/upload`, formData, { headers });
  }

  getAllReportes(): Observable<any[]> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<any[]>(this.apiUrl, { headers });
  }

  getReporteById(id: string): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers });
  }

  updateReporte(id: string, reporteData: any): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/${id}`, reporteData, { headers });
  }

  deleteReporte(id: string): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.delete(`${this.apiUrl}/${id}`, { headers });
  }

  completarReporte(id: string): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/${id}/completar`, {}, { headers });
  }

  denegarReporte(id: string): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/${id}/denegar`, {}, { headers });
  }
}