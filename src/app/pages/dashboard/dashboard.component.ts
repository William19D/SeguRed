import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/authentication.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { UsertopbarComponent } from '../../shared/components/topbar/user/usertopbar/usertopbar.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [FooterComponent, UsertopbarComponent, CommonModule],
  standalone: true,
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user: any = null;
  loading = true;
  error = false;

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
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Obtener datos del usuario desde el servicio de autenticación
    this.user = this.authService.getCurrentUser();
    
    // Si hay un usuario pero necesitamos datos más actualizados, los pedimos al backend
    if (this.user) {
      this.loading = false;
    } else {
      // Intentar obtener información actualizada del usuario usando el token
      this.authService.getUserInfo().subscribe({
        next: (userInfo) => {
          this.user = userInfo;
          this.loading = false;
          this.authService.setCurrentUser(userInfo); // Actualizar el usuario en el servicio
        },
        error: (err) => {
          console.error('Error al obtener información del usuario:', err);
          this.error = true;
          this.loading = false;
          
          // Si hay un error de autenticación, redirigir al login
          if (err.status === 401) {
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }
      });
    }
  }

  makeReport() {
    this.router.navigate(['/make-report']);
  }
}