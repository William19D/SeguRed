import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [RouterModule, CommonModule, HttpClientModule]
})
export class AppComponent implements OnInit {
  private healthCheckUrl = 'https://seguredapi-919088633053.us-central1.run.app//health';
  backendStatus: string = 'Verificando conexión...';

  isLoggedIn: boolean = false; // Variable para controlar qué topbar mostrar

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Verificar conexión con el backend
    this.http.get(this.healthCheckUrl, { responseType: 'text' }).subscribe(
      (response) => {
        console.log('✅ Backend conectado:', response);
        this.backendStatus = '✅ Conexión establecida con la API.';
      },
      (error) => {
        console.error('❌ Error al conectar con la API de Google:', error);
        this.backendStatus = '❌ No se pudo conectar con la API.';
      }
    );

    // Simular verificación de sesión (puedes reemplazar esto con tu lógica real)
    const token = localStorage.getItem('authToken');
    this.isLoggedIn = !!token; // Si hay un token, el usuario está logeado
  }
}