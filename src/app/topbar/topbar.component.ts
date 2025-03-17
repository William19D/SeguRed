import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent {
  isAuthenticated = false;
  username = '';

  constructor(private router: Router) {}

  ngOnInit() {
    const user = localStorage.getItem('user');
    if (user) {
      this.isAuthenticated = true;
      this.username = JSON.parse(user).username;
    }
  }

  logout() {
    localStorage.removeItem('user');
    this.isAuthenticated = false;
    this.router.navigate(['/login']);
  }
}
