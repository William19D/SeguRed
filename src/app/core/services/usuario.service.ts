import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './authentication.service';

export interface Location {
    lat: number;
    lng: number;
}

export interface Usuario {
    id: string;
    nombreCom: string;
    locations: Location[];
}

export interface ActualizacionCuentaDTO {
    nombreCom?: string;
    ciudadResidencia?: string;
    telefono?: string;
    direccion?: string;
    correo?: string;
    preferencia?: string;
    location?: {
        lat: number;
        lng: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class UsuarioService {
    private apiUrl = 'https://seguredapi-919088633053.us-central1.run.app/registro/usuarios';
    private updateApiUrl = 'https://seguredapi-919088633053.us-central1.run.app/cuenta';
    private localApiUrl = 'http://localhost:8080/cuenta';

    constructor(private http: HttpClient, private authService: AuthService) {}

    getUsuarios(): Observable<Usuario[]> {
        return this.http.get<Usuario[]>(this.apiUrl);
    }

    actualizarCuenta(datos: ActualizacionCuentaDTO): Observable<any> {
        // Obtener el token de autenticación
        const token = this.authService.getAuthToken();
        
        if (!token) {
            console.error('No authentication token available');
            return throwError(() => new Error('Authentication token is required'));
        }

        // Formatear el token correctamente (agregar el prefijo Bearer si es necesario)
        const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        // Agregar los headers de content type y authorization
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': bearerToken
        });

        console.log('Sending update with token:', bearerToken);
        console.log('Request data:', datos);

        // Agregar manejo de errores para obtener más detalles sobre lo que está mal
        return this.http.patch(this.updateApiUrl, datos, { headers })
            .pipe(
                catchError(error => {
                    console.error('Error details:', error);
                    if (error.error) {
                        console.error('Server error response:', error.error);
                    }
                    return throwError(() => error);
                })
            );
    }
}