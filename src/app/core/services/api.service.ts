import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'http://localhost:8080/email-news/newssubscription';
  private healthCheckUrl = 'http://localhost:8080/health'; // Endpoint de prueba

  constructor(private http: HttpClient) {}

  enviarCorreo(email: string) {
    return this.http.post(this.apiUrl, { email }, { responseType: 'text' });
  }

  checkConnection() {
    return this.http.get(this.healthCheckUrl, { responseType: 'text' });
  }
}
