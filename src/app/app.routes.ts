import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { RegisterComponent } from './pages/register/register.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },  // Página principal
  { path: 'register', component: RegisterComponent }, // Página de registro
  { path: '**', redirectTo: '' } // Redirige rutas desconocidas a la landing
];
