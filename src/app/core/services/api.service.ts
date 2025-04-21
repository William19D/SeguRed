import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  // URL base de tu API en Cloud Run
  private baseUrl = 'https://seguredapi-919088633053.us-central1.run.app';

  // Endpoints actualizados
  private emailSubUrl = `${this.baseUrl}/suscripcion/noticias`;
  private healthCheckUrl = `${this.baseUrl}/health`; // Ajusta si este endpoint existe en la nube
  private registerUrl = `${this.baseUrl}/registro/usuario`;

  constructor(private http: HttpClient) {}

  enviarCorreo(correo: string) {
    return this.http.post(this.emailSubUrl, { correo }, { responseType: 'text' });
  }

  checkConnection() {
    return this.http.get(this.healthCheckUrl, { responseType: 'text' });
  }

  registerUser(userData: any) {
    return this.http.post(this.registerUrl, userData, { responseType: 'text' });
  }
}
