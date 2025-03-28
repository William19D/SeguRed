import { Component, ElementRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { AuthService } from '../../core/services/authentication.service';

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

  constructor(private authService: AuthService) {}

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

    if (codigoIngresado.length === 6) {
      this.authService.verificarCodigo(codigoIngresado).subscribe(
        (response: { message: string }) => {
          alert(response.message);
        },
        (error: { message: string }) => {
          alert('Código incorrecto o expirado.');
        }
      );
    } else {
      alert('Por favor, completa los 6 dígitos.');
    }
  }
}
