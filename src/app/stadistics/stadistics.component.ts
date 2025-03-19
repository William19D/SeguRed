import { Component } from '@angular/core';

@Component({
  selector: 'app-stadistics', // Este es el nombre del componente
  templateUrl: './stadistics.component.html',
  styleUrls: ['./stadistics.component.css'],
  standalone: true, // ✅ Necesario para standalone components
})
export class StadisticsComponent {
  statisticsData = [
    { icon: 'Icon.png', number: '2,245,341', text: 'Miembros Registrados' },
    { icon: 'assets/incidentes-icon.svg', number: '828,867', text: 'Incidentes Reportados' },
    { icon: 'assets/comunidades-icon.svg', number: '46,328', text: 'Comunidades Activas' }
  ];
}
