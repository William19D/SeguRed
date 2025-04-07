import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-verification-complete',
  imports: [TopbarComponent, FooterComponent],
  templateUrl: './verification-complete.component.html',
  styleUrls: ['./verification-complete.component.css']
})
export class VerificationCompleteComponent {

  constructor(private router: Router) {}

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}