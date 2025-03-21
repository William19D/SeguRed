import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ Importa FormsModule
import { Router } from '@angular/router';

import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent, FooterComponent], // ✅ Agregar FormsModule
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
 
  user: { 
    email: string; 
    password: string; 
    rememberMe: boolean;
  } = {
    email: '',
    password: '',
    rememberMe: false
  };

  constructor(private router: Router) {}

  onLogin() {
    console.log('Usuario logueado:', this.user);

    if (this.user.email === 'admin@example.com' && this.user.password === '123456') {
      alert('Inicio de sesión exitoso');
      this.router.navigate(['/dashboard']);
    } else {
      alert('Correo o contraseña incorrectos');
    }
  }
}
