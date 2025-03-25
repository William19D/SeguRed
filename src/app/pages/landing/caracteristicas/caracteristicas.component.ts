import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-caracteristicas',
  imports: [],
  templateUrl: './caracteristicas.component.html',
  styleUrl: './caracteristicas.component.css'
})
export class CaracteristicasComponent {
  constructor(private router: Router) {} // Inyectar Router en el constructor

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
