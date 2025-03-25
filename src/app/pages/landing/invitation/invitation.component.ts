import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-invitation',
  imports: [],
  templateUrl: './invitation.component.html',
  styleUrl: './invitation.component.css'
})
export class InvitationComponent {
  constructor(private router: Router) {} // Inyectar Router en el constructor

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
