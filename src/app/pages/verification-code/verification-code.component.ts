import { Component, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { AuthService } from '../../core/services/authentication.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-verificacion-correo',
  standalone: true,
  templateUrl: './verification-code.component.html',
  styleUrls: ['./verification-code.component.css'],
  imports: [
    FooterComponent,
    TopbarComponent
  ],
})
export class VerificationCodeComponent {
  
  @ViewChildren('code1, code2, code3, code4, code5, code6') inputs!: QueryList<ElementRef>;
  email: string | null = '';

  constructor(private authService: AuthService, private route: ActivatedRoute, private router: Router) {
    this.email = this.route.snapshot.paramMap.get('email');
    console.log(`Email en VerificationCodeComponent: ${this.email}`);
  }

  moverFoco(event: any, index: number) {
    const inputValue = event.target.value;
    const inputsArray = this.inputs.toArray();
    
    if (inputValue && index < 6) {
      inputsArray[index]?.nativeElement.focus();
    }
  }

  borrarFoco(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && index > 0) {
      const inputsArray = this.inputs.toArray();
      inputsArray[index - 1]?.nativeElement.focus();
    }
  }

  verificarCodigo() {
    const inputsArray = this.inputs.toArray();   
    const codigoIngresado = inputsArray.map(input => input.nativeElement.value).join('');

    if (codigoIngresado.length === 6 && this.email) {
      this.authService.verificarCodigo(this.email, codigoIngresado).subscribe(
        (response: { message: string }) => {
          alert(response.message);
          this.router.navigate(['/home']); // Redirigir al usuario a la página de inicio u otra página después de la verificación
        },
        (error: any) => {
          console.error('Error al verificar el código', error);
          alert('Código incorrecto o expirado.');
        }
      );
    } else {
      alert('Por favor, completa los 6 dígitos.');
    }
  }
}