// filepath: d:\Segured\SeguRed\SeguRed\src\app\app.component.ts
import { Component } from '@angular/core';
import { TopbarComponent } from './topbar/topbar.component';
import { RouterModule } from '@angular/router';
import { WelcomeComponent } from './welcome/welcome.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [TopbarComponent, RouterModule, WelcomeComponent] // Importa RouterModule aquí
})
export class AppComponent {
  title = 'seguRed';
}