// filepath: d:\Segured\SeguRed\SeguRed\src\app\app.component.ts
import { Component } from '@angular/core';
import { TopbarComponent } from './topbar/topbar.component';
import { RouterModule } from '@angular/router';
import { WelcomeComponent } from './welcome/welcome.component';
import { LogoListComponent } from "./logo-list/logo-list.component";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [TopbarComponent, RouterModule, WelcomeComponent, LogoListComponent] // Importa RouterModule aquí
 // Importa RouterModule aquí
})
export class AppComponent {
  title = 'seguRed';
}