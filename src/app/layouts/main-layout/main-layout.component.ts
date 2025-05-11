import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Importa RouterModule
import { UsertopbarComponent } from '../../shared/components/topbar/user/usertopbar/usertopbar.component'; // Importa el componente

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, UsertopbarComponent], // Agrega RouterModule aquí
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent {}