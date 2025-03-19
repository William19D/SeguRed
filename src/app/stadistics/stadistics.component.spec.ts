import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StadisticsComponent } from './stadistics.component';

describe('StadisticsComponent', () => {
  let component: StadisticsComponent;
  let fixture: ComponentFixture<StadisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StadisticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StadisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
