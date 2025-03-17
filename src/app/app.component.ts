// filepath: d:\Segured\SeguRed\SeguRed\src\app\app.component.ts
import { Component } from '@angular/core';
import { TopbarComponent } from './topbar/topbar.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [TopbarComponent, RouterModule] // Importa RouterModule aquí
})
export class AppComponent {
  title = 'seguRed';
}