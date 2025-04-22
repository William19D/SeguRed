import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/authentication.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { UsertopbarComponent } from '../../shared/components/topbar/user/usertopbar/usertopbar.component'; // Importa la topbar

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [FooterComponent, UsertopbarComponent], // Agrega la topbar a imports
  standalone: true,
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user: any;

  reports = [
    {
      title: 'Se encontró un perro labrador',
      distance: '200m',
      address: 'Carrera 7 #15-12',
      description: 'Se encontró un labrador color dorado cerca del parque central. No tiene collar ni identificación. Parece estar bien cuidado, pero está desorientado.',
      generatedTime: 'hace 43 minutos',
      category: 'Mascotas',
      categoryClass: 'mascotas',
      stars: 4,
      imageUrl: 'assets/dog-found.jpg',
      mapUrl: 'assets/map-location.jpg'
    },
    {
      title: 'Robo de Celular en la Avenida',
      distance: '200m',
      address: 'Calle 10 #20-40',
      description: 'Un individuo arrebató un celular a una persona mientras caminaba por la Avenida Principal. El sospechoso vestía una chaqueta negra y escapó corriendo en dirección al parque.',
      generatedTime: 'hace 1 hora',
      category: 'Seguridad',
      categoryClass: 'seguridad',
      stars: 5,
      imageUrl: 'assets/robbery.jpg',
      mapUrl: 'assets/map-location.jpg'
    }
  ];

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    // Simula obtener un usuario desde el servicio de autenticación
    this.user = {
      name: 'Daniel' // Puedes descomentar la línea de abajo para usar datos reales
      // this.authService.getUser();
    };
  }

  makeReport() {
    this.router.navigate(['/make-report']);
  }
}