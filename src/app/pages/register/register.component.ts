import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { TopbarComponent } from '../../shared/components/topbar/general/topbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/authentication.service';
import { LocationService } from '../../core/services/location.service';
import { NominatimService } from '../../core/services/nominatim.service';
import { ColombiaApiService } from '../../core/services/colombia-api.service';
import { LoadingscreenComponent } from '../../shared/components/loadingscreen/loadingscreen.component';
import * as L from 'leaflet';
import { loadavg } from 'os';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [TopbarComponent, 
            FooterComponent, 
            ReactiveFormsModule, 
            CommonModule, 
            LoadingscreenComponent],
})
export class RegisterComponent implements AfterViewInit, OnInit {
  registerForm!: FormGroup;
  isLoading: boolean = false;
  submitted = false;

  map: L.Map | undefined;
  marker: L.Marker | undefined;
  departments: any[] = [];
  cities: any[] = [];
  selectedDepartmentId: number | null = null;
  minBirthdate: string = '';
  maxBirthdate: string = '';

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService,
    private locationService: LocationService,
    private nominatimService: NominatimService,
    private colombiaApiService: ColombiaApiService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.setDateLimits();
    this.initForm();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initForm(): void {
    // Crear el formulario con validadores específicos
    this.registerForm = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/), // Solo letras, espacios y acentos
        Validators.minLength(3),
        Validators.maxLength(100)
      ]],
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ]],
      phone: ['', [
        Validators.required,
        Validators.pattern(/^[0-9]{10}$/), // Solo 10 dígitos para Colombia
        this.validatePhoneNumber
      ]],
      useLocation: [false],
      address: ['', [
        Validators.required,
        Validators.minLength(5)
      ]],
      department: [{value: '', disabled: true}, Validators.required],
      city: ['', Validators.required],
      documentType: ['CC', Validators.required],
      documentNumber: ['', [
        Validators.required,
        this.validateDocumentNumber
      ]],
      birthdate: ['', [
        Validators.required,
        this.validateAge
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.validatePasswordStrength
      ]],
      confirmPassword: ['', [
        Validators.required
      ]],
      locations: [[]]
    }, {
      validators: this.passwordMatchingValidator
    });

    // Actualizar validaciones del documento cuando cambie el tipo
    this.registerForm.get('documentType')?.valueChanges.subscribe(docType => {
      this.registerForm.get('documentNumber')?.updateValueAndValidity();
    });
  }

  // Validator personalizado para el número de teléfono colombiano
  validatePhoneNumber(control: AbstractControl): ValidationErrors | null {
    const phoneNumber = control.value;
    if (!phoneNumber) return null;

    // Validar formato colombiano (10 dígitos, puede empezar con 3)
    if (!/^3[0-9]{9}$/.test(phoneNumber) && !/^[0-9]{10}$/.test(phoneNumber)) {
      return { invalidPhone: true };
    }
    return null;
  }

  // Validator personalizado para el número de documento según el tipo
  validateDocumentNumber(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const documentNumber = control.value;
    const documentType = control.parent?.get('documentType')?.value || 'CC';

    // Validar que solo contenga números
    if (!/^[0-9]+$/.test(documentNumber)) {
      return { onlyNumbers: true };
    }

    // Validaciones específicas según tipo de documento
    switch (documentType) {
      case 'CC':
        // Cédula de ciudadanía: entre 8 y 10 dígitos
        if (documentNumber.length < 8 || documentNumber.length > 10) {
          return { invalidCCLength: true };
        }
        break;
      case 'TI':
        // Tarjeta de identidad: entre 10 y 11 dígitos
        if (documentNumber.length < 10 || documentNumber.length > 11) {
          return { invalidTILength: true };
        }
        break;
      case 'CE':
        // Cédula de extranjería: entre 7 y 12 dígitos
        if (documentNumber.length < 7 || documentNumber.length > 12) {
          return { invalidCELength: true };
        }
        break;
    }

    return null;
  }

  // Validator para verificar edad mínima (14 años)
  validateAge(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const birthdate = new Date(control.value);
    const today = new Date();
    const age = today.getFullYear() - birthdate.getFullYear();
    const m = today.getMonth() - birthdate.getMonth();
    
    // Si el mes actual es menor al mes de nacimiento, o si estamos en el mismo mes pero aún no ha pasado el día
    // entonces aún no ha cumplido los años
    if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
      if (age - 1 < 14) return { minAge: true };
    } else {
      if (age < 14) return { minAge: true };
    }
    
    return null;
  }

  // Validator para la fortaleza de la contraseña
  validatePasswordStrength(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const password = control.value;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const passwordValid = hasUpperCase && hasLowerCase && hasNumbers;
    
    if (!passwordValid) {
      return {
        weakPassword: {
          hasUpperCase,
          hasLowerCase,
          hasNumbers,
          hasSpecialChars
        }
      };
    }
    
    return null;
  }

  // Validator para verificar que las contraseñas coincidan
  passwordMatchingValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  // Getter para facilitar el acceso a los controles del formulario en el HTML
  get f() { return this.registerForm.controls; }

  private initMap(): void {
    // Establecer las coordenadas iniciales a Bogotá, Colombia
    this.map = L.map('map').setView([4.7110, -74.0721], 16); // Aumentar el nivel de zoom inicial a 16

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);

    this.marker = L.marker([4.7110, -74.0721], { draggable: true }).addTo(this.map)
      .bindPopup('Arrastra el marcador para actualizar la dirección.')
      .openPopup();

    this.marker.on('dragend', () => {
      const position = this.marker!.getLatLng();
      this.registerForm.patchValue({
        locations: [{ lat: position.lat, lng: position.lng }]
      });
      this.updateAddress(position.lat, position.lng);
    });
  }

  private setDateLimits(): void {
    const today = new Date();
    
    // Mínima fecha: 14 años atrás
    const minDate = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate());
    this.minBirthdate = minDate.toISOString().split('T')[0];
    
    // Máxima fecha: hoy
    this.maxBirthdate = today.toISOString().split('T')[0];
  }

  onUseLocationChange() {
    const useLocation = this.registerForm.get('useLocation')?.value;
    
    if (useLocation) {
      this.locationService
        .getCurrentLocation()
        .then((lngLat) => {
          this.registerForm.patchValue({
            locations: [{ lat: lngLat.lat, lng: lngLat.lng }]
          });
          
          if (this.map && this.marker) {
            this.map.setView([lngLat.lat, lngLat.lng], 16);
            this.marker.setLatLng([lngLat.lat, lngLat.lng]);
          }
          this.updateAddress(lngLat.lat, lngLat.lng);
        })
        .catch((error) => {
          console.error('Error getting location', error);
        });
    }
  }

  private updateAddress(lat: number, lng: number): void {
    this.nominatimService.reverseGeocode(lat, lng).subscribe(
      (response) => {
        if (response && response.display_name) {
          const address = this.extractPartialAddress(response.display_name);
          const city = this.extractCityFromAddress(response.address);
          const department = this.extractDepartmentFromAddress(response.address);
          
          this.registerForm.patchValue({
            address: address,
            city: city,
            department: department
          });
          
          this.loadCities(department);
        } else {
          this.registerForm.patchValue({
            address: `${lat}, ${lng}` // Fallback en caso de error
          });
        }
      },
      (error) => {
        console.error('Error getting address', error);
        this.registerForm.patchValue({
          address: `${lat}, ${lng}` // Fallback en caso de error
        });
      }
    );
  }

  private extractPartialAddress(fullAddress: string): string {
    const parts = fullAddress.split(',');
    return parts.slice(0, 2).join(','); // Obtener solo hasta la segunda coma
  }

  private extractCityFromAddress(address: any): string {
    if (address.city) {
      return address.city;
    }
    if (address.town) {
      return address.town;
    }
    if (address.village) {
      return address.village;
    }
    if (address.hamlet) {
      return address.hamlet;
    }
    return '';
  }

  private extractDepartmentFromAddress(address: any): string {
    if (address.state) {
      return address.state;
    }
    if (address.county) {
      return address.county;
    }
    return '';
  }

  private loadDepartments(): void {
    this.colombiaApiService.getDepartments().subscribe(
      (data) => {
        this.departments = data;
      },
      (error) => {
        console.error('Error loading departments', error);
      }
    );
  }

  private loadCities(departmentName: string): void {
    const department = this.departments.find(d => d.name === departmentName);
    if (department) {
      this.selectedDepartmentId = department.id;
      this.colombiaApiService.getCitiesByDepartment(department.id).subscribe(
        (data) => {
          this.cities = data;
        },
        (error) => {
          console.error('Error loading cities', error);
        }
      );
    }
  }

  onDepartmentChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedDepartment = selectElement.value;
    
    this.registerForm.patchValue({
      department: selectedDepartment
    });
    
    this.loadCities(selectedDepartment);
  }

  onRegister() {
    this.submitted = true;
    
    // Detener si el formulario es inválido
    if (this.registerForm.invalid) {
      // Desplazarse al primer error
      const firstError = document.querySelector('.invalid-feedback');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    
    const formValue = this.registerForm.getRawValue();
    
    const payload = {
      tpDocumento: formValue.documentType,
      documento: formValue.documentNumber,
      nombreCom: formValue.name,
      fechaNacimiento: formValue.birthdate,
      ciudadResidencia: formValue.city,
      direccion: formValue.address,
      telefono: formValue.phone,
      cargo: '',
      estado: 'EN_ESPERA',
      correo: formValue.email,
      preferencias: '',
      contraseña: formValue.password,
      locations: formValue.locations,
    };

    this.isLoading = true; // Mostrar el indicador de carga

    this.apiService.registerUser(payload).subscribe(
      (response: any) => {
        console.log('Registro exitoso', response);
        this.sendVerificationEmail(formValue.email); // Enviar el correo de verificación
      },
      (error: any) => {
        console.log('Error al registrar', error);
        this.isLoading = false; // Ocultar el indicador de carga en caso de error
      }
    );
  }

  sendVerificationEmail(email: string) {
    this.authService.sendVerificationCode(email).subscribe(
      (response: any) => {
        console.log('Correo de verificación enviado', response);
        console.log(`Redirigiendo a /verification-code/${encodeURIComponent(email)}`);

        // Un timeout para dejar el paso a la animación de carga
        setTimeout(() => {
          this.isLoading = false;
          this.router.navigate([`/verification-code/${encodeURIComponent(email)}`]);
        }, 1000);
      },
      (error: any) => {
        this.isLoading = false; // Desactivar la animación de carga si hay algún error
        console.log('Error al enviar el correo de verificación', error);
      }
    );
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}