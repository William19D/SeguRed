import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsertopbarComponent } from './usertopbar.component';

describe('UsertopbarComponent', () => {
  let component: UsertopbarComponent;
  let fixture: ComponentFixture<UsertopbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsertopbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsertopbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
