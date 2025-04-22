import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; // Importa el servicio Router

@Component({
  selector: 'app-usertopbar',
  standalone: true, // Esto indica que es un componente independiente
  imports: [CommonModule], // Importa CommonModule para usar directivas como ngClass
  templateUrl: './usertopbar.component.html',
  styleUrls: ['./usertopbar.component.css']
})
export class UsertopbarComponent {
  isNavbarHidden = false; // Controla la visibilidad de la barra de navegación
  isUserMenuOpen = false; // Controla la visibilidad del menú desplegable del usuario

  user = {
    name: 'Daniel', // Nombre del usuario
    profilePicture: '', // URL de la imagen de perfil (dejar vacío para usar la imagen por defecto)
    role: 'Usuario' // Rol del usuario
  };

  constructor(private router: Router) { }

  goToDashboard() {
    console.log('Navegando al Dashboard...');
    this.router.navigate(['/dashboard']); // Utiliza el Router para navegar a la ruta '/dashboard'
  }
  goToProfile() {
    console.log('Navegando al perfil...');
    this.router.navigate(['/profile']); // Utiliza el Router para navegar a la ruta '/profile'
  }

  // Método para abrir las notificaciones
  openNotifications() {
    console.log('Abriendo notificaciones...');
    // Implementa la lógica para mostrar notificaciones aquí
  }

  // Método para alternar el estado del menú desplegable de usuario
  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  // Método para cerrar sesión
  logout() {
    console.log('Cerrando sesión...');
    // **Lógica de cierre de sesión:**
    // 1. Limpiar cualquier dato de autenticación almacenado (tokens, información de usuario, etc.)
    localStorage.removeItem('authToken'); // Ejemplo: Eliminar un token del localStorage
    sessionStorage.clear(); // Ejemplo: Limpiar todos los datos de la sessionStorage
    // 2. Redirigir al usuario al Dashboard después de cerrar sesión
    this.router.navigate(['/dashboard']);
  }
}