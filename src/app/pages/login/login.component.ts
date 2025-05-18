import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgxCaptchaModule } from 'ngx-captcha';
import { finalize } from 'rxjs/operators';

import { TopbarComponent } from '../../shared/components/topbar/general/topbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { LoadingscreenComponent } from '../../shared/components/loadingscreen/loadingscreen.component';
import { AuthService } from '../../core/services/authentication.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    NgxCaptchaModule, 
    TopbarComponent, 
    FooterComponent,
    LoadingscreenComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  
  loginForm!: FormGroup;
  recaptchaToken: string | null = null;
  siteKey: string = "6LeoMP0qAAAAAKSJjU9ruPHmHCCVJK_LX1Svmhg8";
  loading = false;
  errorMessage = '';
  submitted = false;
  isModeratorLogin = false; // Nueva propiedad para controlar el tipo de login

  constructor(
    private router: Router, 
    private http: HttpClient,
    private authService: AuthService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required, 
        Validators.email,
        Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6)
      ]],
      rememberMe: [false]
    });
  }

  // Getters for easy access to form fields in template
  get f() { return this.loginForm.controls; }

  // Método para cambiar el tipo de login
  setLoginType(isModerator: boolean): void {
    this.isModeratorLogin = isModerator;
    // Limpiar mensajes de error al cambiar de tipo
    this.errorMessage = '';
  }

  onCaptchaResolved(token: string) {
    this.recaptchaToken = token;
    console.log('Captcha resuelto:', token);
  }

  onLogin() {
  this.submitted = true;
  this.errorMessage = '';
    
  if (this.loginForm.invalid) {
    return;
  }

  if (!this.recaptchaToken) {
    this.errorMessage = "Por favor, completa el reCAPTCHA";
    return;
  }

  this.loading = true;

  // Verificar primero el reCAPTCHA
  this.http.post('https://seguredapi-919088633053.us-central1.run.app/api/recaptcha/verify', 
    { token: this.recaptchaToken }
  ).subscribe({
    next: (res: any) => {
      if (res.success) {
        // CAPTCHA verificado, proceder con la autenticación
        this.processLogin();
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

// Método separado para manejar la lógica de login
private processLogin() {
  const email = this.f['email'].value;
  const password = this.f['password'].value;
  const rememberMe = this.f['rememberMe'].value;
  
  console.log(`Intentando login ${this.isModeratorLogin ? 'como administrador' : 'como usuario regular'}`);
  
  const loginObservable = this.isModeratorLogin 
    ? this.authService.loginAsModerator(email, password)
    : this.authService.login(email, password);
  
  loginObservable.subscribe({
    next: (response) => {
      console.log('Login exitoso, respuesta:', response);
      
      if (this.f['rememberMe'].value) {
        this.authService.setRememberMe(true);
      }
      
      // Si es intento de login como administrador, esperar a que se cargue el perfil completo
      if (this.isModeratorLogin) {
        // Esperar a que se complete getUserInfo() que ya se llama dentro de loginAsModerator
        // y después verificar el rol usando getCurrentUser()
        setTimeout(() => {
          const userData = this.authService.getCurrentUser();
          console.log('Verificando datos completos del usuario:', userData);
          
          if (userData && userData.rol === 'ADMINISTRADOR') {
            console.log('Rol de administrador confirmado, redirigiendo...');
            window.location.href = '/admin-dashboard';
          } else {
            console.log('No se confirmó rol de administrador:', userData?.rol);
            this.authService.logout();
            this.errorMessage = 'Solo el personal autorizado puede iniciar sesión como administrador.';
            this.loading = false;
          }
        }, 1000); // Dar tiempo suficiente para que se complete getUserInfo
      } else {
        // Para login de usuario normal
        console.log('Login de usuario normal, redirigiendo a dashboard');
        this.router.navigate(['/dashboard']);
      }
    },
    error: (err) => {
      console.error('Error de login:', err);
      if (this.isModeratorLogin) {
        this.errorMessage = err.error?.error || 'Acceso denegado. Verifica tus credenciales de administrador.';
      } else {
        this.errorMessage = err.error?.error || 'Correo o contraseña incorrectos';
      }
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