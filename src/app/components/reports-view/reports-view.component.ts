import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { SaleTransaction } from '../../models/product.model';

@Component({
  selector: 'app-reports-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports-view.component.html',
  styleUrl: './reports-view.component.css',
})
export class ReportsViewComponent {
  readonly productService = inject(ProductService);

  readonly viewReceipt = output<SaleTransaction>();

  printReport(): void {
    window.print();
  }
}
