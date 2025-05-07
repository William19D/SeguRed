import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiBaseUrl = 'https://seguredapi-919088633053.us-central1.run.app';
  private apiUrl = `${this.apiBaseUrl}/auth`;
  private tokenKey = 'authToken';
  private userKey = 'currentUser';
  private rememberMeKey = 'rememberMe';
  
  private authStatus = new BehaviorSubject<boolean>(this.isAuthenticated());
  public authStatus$ = this.authStatus.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Verificar en inicialización
    this.checkTokenExpiration();
  }

  // MÉTODOS EXISTENTES

  // Método para registrar un usuario
  registerUser(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiBaseUrl}/registro/usuario`, userData);
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

  // MÉTODOS NUEVOS JWT

  // Método para iniciar sesión
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, {
      correo: email,
      contraseña: password
    }).pipe(
      tap(response => {
        console.log('Login response received:', response);
        if (response && response.token) {
          this.setAuthToken(response.token);
          // Inmediatamente después de recibir el token, obtener los datos del usuario
          this.getUserInfo().subscribe({
            next: (userData) => {
              console.log('User data fetched successfully after login');
            },
            error: (err) => {
              console.error('Failed to fetch user data after login:', err);
            }
          });
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  // Guardar token JWT
  setAuthToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.authStatus.next(true);
  }

  // Obtener token JWT
  getAuthToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Guardar datos del usuario
  setCurrentUser(user: any): void {
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
  }

  // Obtener datos del usuario
  getCurrentUser(): any {
    try {
      const userData = localStorage.getItem(this.userKey);
      if (!userData || userData === "undefined" || userData === "null") {
        return null;
      }
      return JSON.parse(userData);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem(this.userKey); // Clear invalid data
      return null;
    }
  }

  // Establecer "recordar sesión"
  setRememberMe(remember: boolean): void {
    localStorage.setItem(this.rememberMeKey, JSON.stringify(remember));
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  // Obtener información del usuario desde el backend (usando el token)
  getUserInfo(): Observable<any> {
    const token = this.getAuthToken();
    if (!token) {
      return throwError(() => new Error('No hay token disponible'));
    }

    // Asegurar que el token tenga el prefijo "Bearer"
    const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    const headers = new HttpHeaders({
      'Authorization': bearerToken
    });

    console.log('Fetching user data with token...');
    
    return this.http.post(`${this.apiUrl}/usuario-datos`, {}, { headers }).pipe(
      tap((user: any) => {
        console.log('User info received:', user);
        if (user) {
          this.setCurrentUser(user);
        }
      }),
      catchError(error => {
        console.error('Error al obtener información del usuario:', error);
        // Limpiar datos inválidos si existen
        localStorage.removeItem(this.userKey);
        if (error.status === 401) {
          console.log('Token inválido o expirado, cerrando sesión');
          this.logout();
        }
        return throwError(() => error);
      })
    );
  }

  // Verificar si el token ha expirado
  checkTokenExpiration(): void {
    const token = this.getAuthToken();
    if (!token) return;

    try {
      const decodedToken: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      if (decodedToken.exp && decodedToken.exp < currentTime) {
        console.log('Token expirado, cerrando sesión');
        this.logout();
      }
    } catch (error) {
      console.error('Error al decodificar token:', error);
      this.logout();
    }
  }

  // Cerrar sesión
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.authStatus.next(false);
    this.router.navigate(['/login']);
  }

  // Interceptor para agregar el token a todas las solicitudes
  getAuthHeaders(): HttpHeaders {
    const token = this.getAuthToken();
    if (!token) {
      return new HttpHeaders();
    }
    const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    return new HttpHeaders({
      'Authorization': bearerToken
    });
  }

  // Método para eliminar la cuenta
  deleteAccount(): Observable<any> {
    const headers = this.getAuthHeaders();
    
    return this.http.delete(`${this.apiBaseUrl}/cuenta`, { headers }).pipe(
      tap(() => {
        // Limpiar datos locales después de eliminar la cuenta
        this.logout();
      }),
      catchError(error => {
        console.error('Error al eliminar cuenta:', error);
        return throwError(() => error);
      })
    );
  }

  // Método para actualizar datos del usuario
  updateUserProfile(userData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    
    return this.http.patch(`${this.apiBaseUrl}/cuenta`, userData, { headers }).pipe(
      tap((updatedUser: any) => {
        // Actualizar los datos del usuario en el almacenamiento local
        const currentUser = this.getCurrentUser();
        if (currentUser && updatedUser) {
          this.setCurrentUser({ ...currentUser, ...updatedUser });
        }
      }),
      catchError(error => {
        console.error('Error al actualizar perfil:', error);
        return throwError(() => error);
      })
    );
  }

  // Método para cambiar la contraseña
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    const headers = this.getAuthHeaders();
    const payload = {
      currentPassword,
      newPassword
    };
    
    return this.http.post(`${this.apiBaseUrl}/cuenta/cambiar-password`, payload, { headers }).pipe(
      catchError(error => {
        console.error('Error al cambiar contraseña:', error);
        return throwError(() => error);
      })
    );
  }

  // Método para solicitar restablecimiento de contraseña
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password-request`, { correo: email }).pipe(
      catchError(error => {
        console.error('Error al solicitar restablecimiento de contraseña:', error);
        return throwError(() => error);
      })
    );
  }

  // Método para confirmar el restablecimiento de contraseña
  confirmPasswordReset(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password-confirm`, {
      token,
      newPassword
    }).pipe(
      catchError(error => {
        console.error('Error al confirmar restablecimiento de contraseña:', error);
        return throwError(() => error);
      })
    );
  }
}