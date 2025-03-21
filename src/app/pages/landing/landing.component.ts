import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Importar FormsModule
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { RouterModule } from '@angular/router';
import { WelcomeComponent } from './welcome/welcome.component';
import { LogoListComponent } from "./logo-list/logo-list.component";
import { CaracteristicasComponent } from "./caracteristicas/caracteristicas.component";
import { FeaturesComponent } from './features/features.component';
import { StadisticsComponent } from './stadistics/stadistics.component';
import { InvitationComponent } from './invitation/invitation.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
  standalone: true,
  imports: [
    FormsModule,  // Agregar FormsModule aquí
    TopbarComponent,
    RouterModule,
    WelcomeComponent,
    LogoListComponent,
    CaracteristicasComponent,
    FeaturesComponent,
    StadisticsComponent,
    InvitationComponent,
    FooterComponent
  ]
})
export class LandingComponent {
  title = 'seguRed';
  email: string = '';
  subscribe() {
    console.log("Email suscrito:", this.email);
  }
}
