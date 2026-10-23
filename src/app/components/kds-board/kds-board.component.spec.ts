import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KdsBoardComponent } from './kds-board.component';

describe('KdsBoardComponent', () => {
  let component: KdsBoardComponent;
  let fixture: ComponentFixture<KdsBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KdsBoardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(KdsBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
