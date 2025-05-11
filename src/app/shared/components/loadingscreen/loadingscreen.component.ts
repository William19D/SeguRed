import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loadingscreen',
  imports: [CommonModule],
  templateUrl: './loadingscreen.component.html',
  standalone: true,
  styleUrl: './loadingscreen.component.css'
})
export class LoadingscreenComponent {
  @Input() message: string = 'Cargando datos...';
}