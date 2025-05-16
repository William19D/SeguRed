import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

}   

@Injectable({
    providedIn: 'root'
})
export class UsuarioService {
    private apiUrl = 'https://seguredapi-919088633053.us-central1.run.app/registro/usuarios';
     private updateApiUrl = 'https://seguredapi-919088633053.us-central1.run.app/cuenta/seguro';
     private localApiUrl = 'http://localhost:8080/cuenta/seguro';

    constructor(private http: HttpClient) {}

    getUsuarios(): Observable<Usuario[]> {
        return this.http.get<Usuario[]>(this.apiUrl);
    }

    actualizarCuenta(datos: ActualizacionCuentaDTO): Observable<any> {
        return this.http.patch(this.localApiUrl, datos);
    }
}
