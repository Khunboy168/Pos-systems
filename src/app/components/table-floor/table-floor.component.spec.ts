import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableFloorComponent } from './table-floor.component';

describe('TableFloorComponent', () => {
  let component: TableFloorComponent;
  let fixture: ComponentFixture<TableFloorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableFloorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TableFloorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
