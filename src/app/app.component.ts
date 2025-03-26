import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [RouterModule, CommonModule, HttpClientModule] // Agregamos HttpClientModule aquí
})
export class AppComponent implements OnInit {
  private healthCheckUrl = 'http://localhost:8080/health'; 
  backendStatus: string = 'Verificando conexión...';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get(this.healthCheckUrl, { responseType: 'text' }).subscribe(
      (response) => {
        console.log('✅ Backend conectado:', response);
        this.backendStatus = '✅ Conexión establecida con el backend.';
      },
      (error) => {
        console.error('❌ Error al conectar con el backend:', error);
        this.backendStatus = '❌ No se pudo conectar con el backend.';
      }
    );
  }
}
