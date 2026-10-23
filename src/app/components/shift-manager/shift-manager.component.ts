import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { ShiftRecord } from '../../models/product.model';

@Component({
  selector: 'app-shift-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shift-manager.component.html',
  styleUrl: './shift-manager.component.css',
})
export class ShiftManagerComponent {
  readonly productService = inject(ProductService);

  readonly zReportGenerated = output<ShiftRecord>();
  readonly requestPinApproval = output<() => void>();
  readonly toastTriggered = output<{ message: string; type: 'success' | 'danger' | 'info' }>();

  showOpenShiftModal = signal<boolean>(false);
  showCashMovementModal = signal<boolean>(false);
  showCloseShiftModal = signal<boolean>(false);

  shiftCashierName = signal<string>('Bopha (Cashier 1)');
  openUsdFloat = signal<number>(20.0);
  openKhrFloat = signal<number>(40000);
  countedCloseUsd = signal<number>(0);
  countedCloseKhr = signal<number>(0);

  movementType = signal<'IN' | 'OUT'>('IN');
  movementAmount = signal<number>(5.0);
  movementCurrency = signal<'USD' | 'KHR'>('USD');
  movementReason = signal<string>('Buy ice bags for bar');

  openShiftDialog(): void {
    this.showOpenShiftModal.set(true);
  }

  confirmOpenShift(): void {
    this.productService.openShift(this.shiftCashierName(), this.openUsdFloat(), this.openKhrFloat());
    this.showOpenShiftModal.set(false);
    this.toastTriggered.emit({
      message: `Shift opened for ${this.shiftCashierName()} with float $${this.openUsdFloat()} + ${this.openKhrFloat().toLocaleString()} ៛`,
      type: 'success',
    });
  }

  openCashMovementDialog(): void {
    this.showCashMovementModal.set(true);
  }

  confirmCashMovement(): void {
    if (this.movementAmount() <= 0) return;
    this.productService.recordCashMovement(
      this.movementType(),
      this.movementAmount(),
      this.movementCurrency(),
      this.movementReason().trim() || 'General adjustment'
    );
    this.showCashMovementModal.set(false);
    this.toastTriggered.emit({
      message: `Recorded Cash ${this.movementType()} of ${this.movementAmount()} ${this.movementCurrency()}`,
      type: 'info',
    });
  }

  openCloseShiftDialog(): void {
    this.countedCloseUsd.set(0);
    this.countedCloseKhr.set(0);
    this.showCloseShiftModal.set(true);
  }

  confirmBlindCloseShift(): void {
    this.requestPinApproval.emit(() => {
      const closed = this.productService.closeShift(this.countedCloseUsd(), this.countedCloseKhr());
      this.showCloseShiftModal.set(false);
      this.zReportGenerated.emit(closed);
      this.toastTriggered.emit({
        message: `Shift #${closed.shiftNo} closed. Z-Report generated!`,
        type: 'success',
      });
    });
  }
}
