import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { CreateReportComponent } from './pages/create-report/create-report.component';

import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { LandingComponent } from './pages/landing/landing.component';
import { LoginComponent } from './pages/login/login.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { RecoverPasswordComponent } from './pages/recover-password/recover-password.component';
import { RegisterComponent } from './pages/register/register.component';
import { TestMapComponent } from './pages/test-map/test-map.component';
import { VerificationCodeComponent } from './pages/verification-code/verification-code.component';
import { VerificationCompleteComponent } from './pages/verification-complete/verification-complete.component';
import { PasswordCodeVerificationComponent } from './pages/password-code-verification/password-code-verification.component';

export const routes: Routes = [
  // Redirección específica para la ruta raíz - DEBE ESTAR PRIMERO
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  
  // Rutas públicas
  { path: 'home', component: LandingComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'verification-code/:email', component: VerificationCodeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'recover-password', component: RecoverPasswordComponent },
  { path: 'mapbox', component: TestMapComponent },
  { path: 'verification-complete', component: VerificationCompleteComponent },
  { path: 'password-code-verification', component: PasswordCodeVerificationComponent },

  // Remove this standalone route:
  // { path: 'create-report', component: CreateReportComponent },
  
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'create-report', component: CreateReportComponent },

    ]
  },
  
  // Ruta para cualquier otra URL no definida
  { path: '**', redirectTo: 'home' }
];