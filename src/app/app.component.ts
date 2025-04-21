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
  private healthCheckUrl = 'https://www.googleapis.com/discovery/v1/apis'; // ✅ URL ejemplo de API de Google
  backendStatus: string = 'Verificando conexión...';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get(this.healthCheckUrl, { responseType: 'text' }).subscribe(
      (response) => {
        console.log('✅ Backend conectado:', response);
        this.backendStatus = '✅ Conexión establecida con la API de Google.';
      },
      (error) => {
        console.error('❌ Error al conectar con la API de Google:', error);
        this.backendStatus = '❌ No se pudo conectar con la API de Google.';
      }
    );
  }
}
