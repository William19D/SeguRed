import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { RegisterComponent } from './pages/register/register.component';
import { LoginComponent } from './pages/login/login.component';
import { RecoverPasswordComponent } from './pages/recover-password/recover-password.component';
import { VerificationCodeComponent } from './pages/verification-code/verification-code.component';
import { TestMapComponent } from './pages/test-map/test-map.component';
import { VerificationCompleteComponent } from './pages/verification-complete/verification-complete.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
  { path: 'home', component: LandingComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'verification-code/:email', component: VerificationCodeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'recover-password', component: RecoverPasswordComponent},
  { path: 'mapbox', component: TestMapComponent},
  { path: 'verification-complete', component: VerificationCompleteComponent},
  {path: 'dashboard', component: DashboardComponent}, // Ruta para el dashboard
  { path: '', redirectTo: '/home', pathMatch: 'full' }, // Redirección a la landing por defecto

];
