import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private emailSubUrl = 'http://localhost:8080/suscripcion/noticias';
  private healthCheckUrl = 'http://localhost:8080/health'; // Endpoint de prueba
  private registerUrl= 'http://localhost:8080/registro/usuario';

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
