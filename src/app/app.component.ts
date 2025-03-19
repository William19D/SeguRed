import { Component } from '@angular/core';
import { TopbarComponent } from './topbar/topbar.component';
import { RouterModule } from '@angular/router';
import { WelcomeComponent } from './welcome/welcome.component';
import { LogoListComponent } from "./logo-list/logo-list.component";
import { CaracteristicasComponent } from "./caracteristicas/caracteristicas.component";
import { FeaturesComponent } from './features/features.component';
import { StadisticsComponent } from './stadistics/stadistics.component';
import { InvitationComponent } from './invitation/invitation.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [
    TopbarComponent,
    RouterModule,
    WelcomeComponent,
    LogoListComponent,
    CaracteristicasComponent,
    FeaturesComponent,
    StadisticsComponent,
    InvitationComponent // Asegúrate de que este componente esté correctamente importado
  ]
})
export class AppComponent {
  title = 'seguRed';
}