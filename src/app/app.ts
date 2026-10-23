import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from './services/product.service';
import { SaleTransaction, ShiftRecord, CafeTable } from './models/product.model';

// Import our modular standalone components
import { ProductTableComponent } from './components/product-table/product-table.component';
import { PosTerminalComponent } from './components/pos-terminal/pos-terminal.component';
import { TableFloorComponent } from './components/table-floor/table-floor.component';
import { KdsBoardComponent } from './components/kds-board/kds-board.component';
import { ShiftManagerComponent } from './components/shift-manager/shift-manager.component';
import { CustomerDisplayComponent } from './components/customer-display/customer-display.component';
import { ReportsViewComponent } from './components/reports-view/reports-view.component';
import { ReceiptModalComponent } from './components/receipt-modal/receipt-modal.component';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'danger' | 'info';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProductTableComponent,
    PosTerminalComponent,
    TableFloorComponent,
    KdsBoardComponent,
    ShiftManagerComponent,
    CustomerDisplayComponent,
    ReportsViewComponent,
    ReceiptModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly productService = inject(ProductService);

  // Active Tab
  activeTab = signal<'inventory' | 'cashier' | 'tables' | 'kitchen' | 'shift' | 'display' | 'reports'>('inventory');

  // Language
  currentLang = signal<'en' | 'km'>('en');

  // Active Receipt & Z-Report
  activeReceipt = signal<SaleTransaction | null>(null);
  activeZReport = signal<ShiftRecord | null>(null);
  showZReportModal = signal<boolean>(false);

  // Manager PIN Approval Pad
  showPinModal = signal<boolean>(false);
  pinInput = signal<string>('');
  pinTargetAction: (() => void) | null = null;
  pinError = signal<string>('');

  // Toasts Host
  toasts = signal<Toast[]>([]);
  private toastCounter = 0;

  toggleLanguage(): void {
    const next = this.currentLang() === 'en' ? 'km' : 'en';
    this.currentLang.set(next);
    this.productService.currentLanguage.set(next);
    this.addToast(next === 'km' ? 'បានប្តូរទៅជាភាសាខ្មែរ' : 'Switched to English', 'info');
  }

  handleTableSelect(table: CafeTable): void {
    this.productService.selectedTable.set(table.name);
    this.productService.activeOrderType.set('Dine-in');
    this.activeTab.set('cashier');
    this.addToast(`Ordering for ${table.name} (${table.area})`, 'info');
  }

  handleOrderCompleted(receipt: SaleTransaction): void {
    this.activeReceipt.set(receipt);
  }

  handleZReportGenerated(shift: ShiftRecord): void {
    this.activeZReport.set(shift);
    this.showZReportModal.set(true);
  }

  printReceipt(): void {
    window.print();
  }

  // Manager PIN Security
  promptManagerPin(action: () => void): void {
    this.pinTargetAction = action;
    this.pinInput.set('');
    this.pinError.set('');
    this.showPinModal.set(true);
  }

  appendPinDigit(digit: string): void {
    if (this.pinInput().length < 4) {
      this.pinInput.update((p) => p + digit);
    }
    if (this.pinInput().length === 4) {
      this.verifyPin();
    }
  }

  clearPin(): void {
    this.pinInput.set('');
    this.pinError.set('');
  }

  verifyPin(): void {
    const pin = this.pinInput();
    if (pin === '2222' || pin === '3333' || pin === '1111') {
      const act = this.pinTargetAction;
      this.showPinModal.set(false);
      this.pinInput.set('');
      this.pinTargetAction = null;
      if (act) act();
    } else {
      this.pinError.set('Incorrect PIN. Try 2222 or 3333');
      this.pinInput.set('');
    }
  }

  addToast(message: string, type: 'success' | 'danger' | 'info' = 'info'): void {
    const id = ++this.toastCounter;
    this.toasts.update((list) => [...list, { id, message, type }]);
    setTimeout(() => {
      this.dismissToast(id);
    }, 3800);
  }

  dismissToast(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
