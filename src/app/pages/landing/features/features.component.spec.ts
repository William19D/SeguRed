import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-features',
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.css']
})
export class FeaturesComponent {
  lastScrollY = window.scrollY;
  isNavbarHidden = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const currentScrollY = window.scrollY;
    this.isNavbarHidden = currentScrollY > this.lastScrollY;
    this.lastScrollY = currentScrollY;
  }
}
