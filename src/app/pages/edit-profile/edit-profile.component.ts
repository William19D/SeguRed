import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/authentication.service';
import { UsuarioService, ActualizacionCuentaDTO } from '../../core/services/usuario.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FooterComponent],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.css']
})
export class EditProfileComponent implements OnInit {
  profileForm!: FormGroup;
  isLoading: boolean = false;
  error: string | null = null;
  success: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.initForm();
    this.loadUserData();
  }

  initForm(): void {
    this.profileForm = this.fb.group({
      nombreCom: ['', [Validators.required, Validators.minLength(3)]],
      ciudadResidencia: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      direccion: ['', [Validators.required, Validators.minLength(5)]],
      correo: [{ value: '', disabled: true }],
    });
  }

  loadUserData(): void {
    this.isLoading = true;

    this.authService.getUserInfo().subscribe({
      next: (userData) => {
        // Actualizar el formulario con los datos del usuario
        this.profileForm.patchValue({
          nombreCom: userData.nombreCom || '',
          ciudadResidencia: userData.ciudadResidencia || '',
          telefono: userData.telefono || '',
          direccion: userData.direccion || '',
          correo: userData.correo || userData.email || '',
        });
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.profileForm.controls).forEach(key => {
        const control = this.profileForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.success = null;

    // Obtener solo los campos que han cambiado
    const formValue = this.profileForm.getRawValue();
    const actualizacionData: ActualizacionCuentaDTO = {};
    
    if (this.profileForm.get('nombreCom')?.dirty) {
      actualizacionData.nombreCom = formValue.nombreCom;
    }
    if (this.profileForm.get('ciudadResidencia')?.dirty) {
      actualizacionData.ciudadResidencia = formValue.ciudadResidencia;
    }
    if (this.profileForm.get('telefono')?.dirty) {
      actualizacionData.telefono = formValue.telefono;
    }
    if (this.profileForm.get('direccion')?.dirty) {
      actualizacionData.direccion = formValue.direccion;
    }

    // Si no hay cambios, mostrar mensaje y no hacer la petición
    if (Object.keys(actualizacionData).length === 0) {
      this.success = 'No se han detectado cambios en la información';
      this.isLoading = false;
      return;
    }

    // Enviar solicitud para actualizar datos
    this.usuarioService.actualizarCuenta(actualizacionData).subscribe({
      next: (response) => {
        this.success = 'Perfil actualizado correctamente';
        this.isLoading = false;
        
        // Actualizar datos en el localStorage a través del servicio de autenticación
        this.authService.getUserInfo().subscribe();
        
        // Resetear estado de formulario modificado
        this.profileForm.markAsPristine();
      },
      error: (error) => {
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  handleError(error: HttpErrorResponse): void {
    if (error.status === 401) {
      this.error = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      setTimeout(() => {
        this.authService.logout();
        this.router.navigate(['/login']);
      }, 2000);
    } else {
      this.error = error.error?.error || 'Ocurrió un error al actualizar el perfil. Inténtalo nuevamente.';
    }
    console.error('Error:', error);
  }

  cancel(): void {
    this.router.navigate(['/profile']);
  }
}