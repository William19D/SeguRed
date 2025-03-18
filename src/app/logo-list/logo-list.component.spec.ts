import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogoListComponent } from './logo-list.component';

describe('LogoListComponent', () => {
  let component: LogoListComponent;
  let fixture: ComponentFixture<LogoListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogoListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
