import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'https://seguredapi-919088633053.us-central1.run.app/auth';

  constructor(private http: HttpClient) {}

  // Método para registrar un usuario
  registerUser(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData);
  }

  // Método para enviar el código de verificación
  sendVerificationCode(email: string): Observable<any> {
    const payload = { email: email };
    return this.http.post<any>(`${this.apiUrl}/codigo-usuario`, payload);
  }

  // Método para verificar el código de verificación
  verificarCodigo(email: string, code: string): Observable<{ message: string }> {
    const payload = { email: email, code: code };
    return this.http.post<{ message: string }>(`${this.apiUrl}/token`, payload);
  }
}
