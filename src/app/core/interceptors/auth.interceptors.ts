import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/authentication.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Obtenemos el token de autenticación
    const token = this.authService.getAuthToken();
    console.log('Interceptor token:', token); // Debug log
    
    // Si hay token, lo añadimos a la cabecera
    if (token) {
      // Aseguramos que el token tenga el formato correcto
      const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      console.log('Adding Authorization header:', bearerToken); // Debug log
      
      request = request.clone({
        setHeaders: {
          Authorization: bearerToken
        }
      });
    } else {
      console.warn('No token available for request:', request.url); // Debug warning
    }

    // Continuamos con la petición y manejamos errores
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si el error es 401 (No autorizado), redirigimos al login
        if (error.status === 401) {
          console.log('401 Unauthorized - Logging out'); // Debug log
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}