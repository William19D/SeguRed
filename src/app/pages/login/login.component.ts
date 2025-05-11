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
        // This code will run if there's an error in the captcha verification
        // The loading flag will be set to false if there's an error in the next subscription
      })
    ).subscribe({
      next: (res: any) => {
        if (res.success) {
          // CAPTCHA validado, proceder con autenticación
          this.authService.login(
            this.f['email'].value,
            this.f['password'].value
          ).pipe(
            finalize(() => {
              // This ensures loading is set to false whether login succeeds or fails
              if (!this.authService.isAuthenticated()) {
                this.loading = false;
              }
            })
          ).subscribe({
            next: (response) => {
              if (this.f['rememberMe'].value) {
                this.authService.setRememberMe(true);
              }
              console.log('Inicio de sesión exitoso');
              this.router.navigate(['/dashboard']);
              // Loading will be hidden after navigation
            },
            error: (err) => {
              this.errorMessage = err.error?.error || 'Correo o contraseña incorrectos';
              // Loading is set to false in finalize()
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