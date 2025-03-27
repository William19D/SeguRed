import { Component, ElementRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';

@Component({
  selector: 'app-verificacion-correo',
  standalone: true,
  templateUrl: './verification-code.component.html',
  styleUrls: ['./verification-code.component.css'],
  imports: [
    FooterComponent,
    TopbarComponent],
})
export class VerificationCodeComponent {
  
  @ViewChildren('code1, code2, code3, code4, code5, code6') inputs!: QueryList<ElementRef>;

  moverFoco(event: any, index: number) {
    const inputValue = event.target.value;
    if (inputValue && index < 6) {
      this.inputs.get(index)?.nativeElement.focus();
    }
  }

  verificarCodigo() {
    const codigoIngresado = this.inputs.map(input => input.nativeElement.value).join('');
    console.log('Código ingresado:', codigoIngresado);

    if (codigoIngresado.length === 6) {
      alert('Código verificado correctamente');
    } else {
      alert('Por favor, completa los 6 dígitos');
    }
  }
}
