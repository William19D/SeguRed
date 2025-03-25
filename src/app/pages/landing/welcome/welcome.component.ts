import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterModule], // Permite navegación en la plantilla si es necesario
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'] // Corregido (debe ser 'styleUrls')
})
export class WelcomeComponent {
  constructor(private router: Router) {} // Inyectar Router en el constructor

  goToRegister() {
    this.router.navigate(['/register']);
  }

}
