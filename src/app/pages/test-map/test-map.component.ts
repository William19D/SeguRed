import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { UsuarioService } from '../../core/services/usuario.service';

export interface Location {
  lat: number;
  lng: number;
}

export interface Usuario {
  id: string;
  nombreCom: string;
  locations: Location[];
}

@Component({
  selector: 'app-test-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.css']
})
export class TestMapComponent implements OnInit {
  usuarios: Usuario[] = [];

  constructor(private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    this.usuarioService.getUsuarios().subscribe((data: Usuario[]) => {
      this.usuarios = data;
      // Pequeño retraso para asegurarnos de que los contenedores de cada mapa ya están en el DOM
      setTimeout(() => this.initializeMaps(), 0);
    });
  }

  initializeMaps(): void {
    // Define un delta que usarás para crear una zona pequeña alrededor de la coordenada
    const delta = 0.005;
    this.usuarios.forEach((user, userIndex) => {
      user.locations.forEach((location, locIndex) => {
        const mapId = 'map' + userIndex + '-' + locIndex;
        const map = L.map(mapId, {
          scrollWheelZoom: false
        });
        
        // Definir un pequeño bounds alrededor de la latitud y longitud recibidos
        const southWest = L.latLng(location.lat - delta, location.lng - delta);
        const northEast = L.latLng(location.lat + delta, location.lng + delta);
        const bounds = L.latLngBounds(southWest, northEast);
        
        // Ajustar el mapa a estos límites
        map.fitBounds(bounds);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Agregar un marcador en la posición exacta
        L.marker([location.lat, location.lng]).addTo(map);

        // Forzar la recalibración del tamaño del mapa para asegurar que se vea correctamente
        setTimeout(() => {
          map.invalidateSize();
        }, 200);
      });
    });
  }
}