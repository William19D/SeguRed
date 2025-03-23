import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgxCaptchaModule } from 'ngx-captcha';

import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxCaptchaModule, TopbarComponent, FooterComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  
  user = { email: '', password: '', rememberMe: false };
  recaptchaToken: string | null = null;
  siteKey: string = "6LeoMP0qAAAAAKSJjU9ruPHmHCCVJK_LX1Svmhg8"; // 🔑 Clave de sitio

  constructor(private router: Router, private http: HttpClient) {}

  onCaptchaResolved(token: string) {
    this.recaptchaToken = token;
    console.log('Captcha resuelto:', token);
  }

  onLogin() {
    if (!this.recaptchaToken) {
      alert("Por favor, completa el reCAPTCHA");
      return;
    }

    this.http.post('http://localhost:8080/api/recaptcha/verify', { token: this.recaptchaToken })
      .subscribe((res: any) => {
        if (res.success) {
          console.log('Captcha validado correctamente');

          if (this.user.email === 'admin' && this.user.password === 'admin') {
            alert('Inicio de sesión exitoso');
            this.router.navigate(['/dashboard']);
          } else {
            alert('Correo o contraseña incorrectos');
          }
        } else {
          alert('Verificación de reCAPTCHA fallida');
        }
      }, err => {
        alert('Error en la verificación del reCAPTCHA');
      });
  }
}
