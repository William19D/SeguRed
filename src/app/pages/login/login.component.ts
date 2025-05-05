import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgxCaptchaModule } from 'ngx-captcha';

import { TopbarComponent } from '../../shared/components/topbar/general/topbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { AuthService } from '../../core/services/authentication.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxCaptchaModule, TopbarComponent, FooterComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  
  user = { email: '', password: '', rememberMe: false };
  recaptchaToken: string | null = null;
  siteKey: string = "6LeoMP0qAAAAAKSJjU9ruPHmHCCVJK_LX1Svmhg8";
  loading = false;
  errorMessage = '';

  constructor(
    private router: Router, 
    private http: HttpClient,
    private authService: AuthService
  ) {}

  onCaptchaResolved(token: string) {
    this.recaptchaToken = token;
    console.log('Captcha resuelto:', token);
  }

  onLogin() {
    this.errorMessage = '';
    this.loading = true;
    
    if (!this.recaptchaToken) {
      this.errorMessage = "Por favor, completa el reCAPTCHA";
      this.loading = false;
      return;
    }

    // Verificar CAPTCHA
    this.http.post('https://seguredapi-919088633053.us-central1.run.app/api/recaptcha/verify', 
      { token: this.recaptchaToken }
    ).subscribe({
      next: (res: any) => {
        if (res.success) {
          // CAPTCHA validado, proceder con autenticación
          this.http.post('https://seguredapi-919088633053.us-central1.run.app/auth/login', {
            correo: this.user.email,
            contraseña: this.user.password
          }).subscribe({
            next: (loginRes: any) => {
              // Guardar token y datos de usuario
              this.authService.setAuthToken(loginRes.token);
              this.authService.setCurrentUser(loginRes.usuario);
              
              // Establecer tiempo de expiración si es necesario
              if (this.user.rememberMe) {
                this.authService.setRememberMe(true);
              }
              
              console.log('Inicio de sesión exitoso');
              this.router.navigate(['/dashboard']);
            },
            error: (err) => {
              this.errorMessage = err.error?.error || 'Correo o contraseña incorrectos';
              this.loading = false;
            }
          });
        } else {
          this.errorMessage = 'Verificación de reCAPTCHA fallida';
          this.loading = false;
        }
      },
      error: (err) => {
        this.errorMessage = 'Error en la verificación del reCAPTCHA';
        this.loading = false;
      }
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  goToRecoverPassword() {
    this.router.navigate(['/recover-password']);
  }
}