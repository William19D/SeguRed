import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  registerUser(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData);
  }

  sendVerificationCode(email: string): Observable<any> {
    const payload = { email: email };
    return this.http.post<any>(`${this.apiUrl}/enviar-codigo`, payload);
  }

  verificarCodigo(email: string, code: string): Observable<{ message: string }> {
    const payload = { email: email, code: code };
    return this.http.post<{ message: string }>(`${this.apiUrl}/verificar-codigo`, payload);
  }
}