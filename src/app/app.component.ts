import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [RouterModule, CommonModule] // Agregamos CommonModule para usar *ngIf si es necesario
})
export class AppComponent implements OnInit {
  private healthCheckUrl = 'http://localhost:8080/health'; // Endpoint de verificación
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
