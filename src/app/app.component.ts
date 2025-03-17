// filepath: d:\Segured\SeguRed\SeguRed\src\app\app.component.ts
import { Component } from '@angular/core';
import { TopbarComponent } from './topbar/topbar.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [TopbarComponent] // Importa el componente aquí
})
export class AppComponent {
  title = 'seguRed';
}