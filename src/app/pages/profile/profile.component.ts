import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsertopbarComponent } from '../../shared/components/topbar/user/usertopbar/usertopbar.component'; // Importa la topbar

interface UserProfile {
  name: string;
  email: string;
  fullName: string;
  phone: string;
  city: string;
  address: string;
  documentNumber: string;
  birthDate: string;
  profilePicture?: string; // Opcional
}

@Component({
  selector: 'app-profile', // Selector ajustado
  standalone: true,
  imports: [CommonModule, UsertopbarComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  userProfile: UserProfile = {
    name: 'Daniel Muñoz',
    email: 'daniel@uniquindio.edu.co',
    fullName: 'Daniel Esteban Muñoz Hernandez',
    phone: '3215442345',
    city: 'Armenia',
    address: 'Calle 123 #123N',
    documentNumber: '1004913011',
    birthDate: '19/10/2003',
    profilePicture: 'default-profile.png'
  };

  constructor() { }

  ngOnInit(): void {
    // Aquí podrías cargar los datos del perfil del usuario desde un servicio
  }

  eliminarCuenta() {
    console.log('Eliminar cuenta solicitado');
  }

  editarPerfil() {
    console.log('Editar perfil solicitado');
  }
}