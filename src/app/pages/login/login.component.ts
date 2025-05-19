import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgxCaptchaModule, ReCaptcha2Component } from 'ngx-captcha';
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
  
  // Añadir referencia al captcha
  @ViewChild('captchaElem') captchaElem!: ReCaptcha2Component;  
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
  
  // Stop here if form is invalid
  if (this.loginForm.invalid) {
    return;
  }

  if (!this.recaptchaToken) {
    this.errorMessage = "Por favor, completa el reCAPTCHA";
    return;
  }

  // Show loading animation
  this.loading = true;

  // Verificar CAPTCHA
  this.http.post('https://seguredapi-919088633053.us-central1.run.app/api/recaptcha/verify', 
    { token: this.recaptchaToken }
  ).pipe(
    finalize(() => {
      // Este código se ejecutará si hay un error en la verificación del captcha
    })
  ).subscribe({
    next: (res: any) => {
      if (res.success) {
        // CAPTCHA validado, proceder con autenticación
        const loginObservable = this.isModeratorLogin 
          ? this.authService.loginAsModerator(this.f['email'].value, this.f['password'].value)
          : this.authService.login(this.f['email'].value, this.f['password'].value);

        loginObservable.pipe(
  finalize(() => {
    if (!this.authService.isAuthenticated()) {
      this.loading = false;
      this.resetCaptcha();
    }
  })
).subscribe({
  next: (response) => {
    if (this.f['rememberMe'].value) {
      this.authService.setRememberMe(true);
    }
    console.log('Inicio de sesión exitoso');
    
    // Añadir un retraso para asegurar que los datos del usuario se han cargado
    setTimeout(() => {
      // Verificar el rol del usuario después del inicio de sesión exitoso
      const isAdmin = this.authService.isAdministrator();
      console.log('¿Es administrador?', isAdmin);
      console.log('Rol actual:', localStorage.getItem('user_role'));
      
      if (isAdmin) {
        console.log('Redirigiendo a admin-dashboard');
        this.router.navigate(['/admin/dashboard']); // Cambiado a '/admin/dashboard'
      } else {
        const redirectUrl = this.isModeratorLogin ? '/moderator-dashboard' : '/dashboard';
        console.log('Redirigiendo a', redirectUrl);
        this.router.navigate([redirectUrl]);
      }
    }, 1000); // Esperar 1 segundo
  },
  error: (err) => {
    // Código de error existente
  }
});
      } else {
        this.errorMessage = 'Verificación de reCAPTCHA fallida';
        this.loading = false;
        this.resetCaptcha();
      }
    },
    error: (err) => {
      this.errorMessage = 'Error en la verificación del reCAPTCHA';
      this.loading = false;
      this.resetCaptcha();
    }
  });
}

  // Método para reiniciar el captcha
  resetCaptcha() {
    this.recaptchaToken = null;
    if (this.captchaElem) {
      this.captchaElem.resetCaptcha();
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  goToRecoverPassword() {
    this.router.navigate(['/recover-password']);
  }
}