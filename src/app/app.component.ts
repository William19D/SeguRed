import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Importar FormsModule
import { TopbarComponent } from './topbar/topbar.component';
import { RouterModule } from '@angular/router';
import { WelcomeComponent } from './welcome/welcome.component';
import { LogoListComponent } from "./logo-list/logo-list.component";
import { CaracteristicasComponent } from "./caracteristicas/caracteristicas.component";
import { FeaturesComponent } from './features/features.component';
import { StadisticsComponent } from './stadistics/stadistics.component';
import { InvitationComponent } from './invitation/invitation.component';
import { FooterComponent } from './footer/footer.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
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
export class AppComponent {
  title = 'seguRed';
  email: string = ''; // Definir la variable para ngModel

  subscribe() {
    console.log("Email suscrito:", this.email);
  }
}
