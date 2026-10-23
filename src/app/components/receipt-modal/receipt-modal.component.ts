import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SaleTransaction } from '../../models/product.model';

@Component({
  selector: 'app-receipt-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './receipt-modal.component.html',
  styleUrl: './receipt-modal.component.css',
})
export class ReceiptModalComponent {
  readonly receipt = input<SaleTransaction | null>(null);
  readonly closed = output<void>();

  printReceipt(): void {
    window.print();
  }

  closeModal(): void {
    this.closed.emit();
  }
}
