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

@Injectable({
    providedIn: 'root'
})
export class UsuarioService {
    private apiUrl = 'https://seguredapi-919088633053.us-central1.run.app/registro/usuarios';

    constructor(private http: HttpClient) {}

    getUsuarios(): Observable<Usuario[]> {
        return this.http.get<Usuario[]>(this.apiUrl);
    }
}
