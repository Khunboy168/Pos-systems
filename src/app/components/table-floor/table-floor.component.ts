import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { CafeTable } from '../../models/product.model';

@Component({
  selector: 'app-table-floor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-floor.component.html',
  styleUrl: './table-floor.component.css',
})
export class TableFloorComponent {
  readonly productService = inject(ProductService);

  readonly tableSelected = output<CafeTable>();
  readonly toastTriggered = output<{ message: string; type: 'success' | 'danger' | 'info' }>();

  selectTable(table: CafeTable): void {
    this.tableSelected.emit(table);
  }

  clearTableBill(table: CafeTable): void {
    if (confirm(`Settle bill and clear ${table.name}?`)) {
      this.productService.setTableStatus(table.name, 'available');
      this.toastTriggered.emit({ message: `${table.name} is now available`, type: 'success' });
    }
  }
}
