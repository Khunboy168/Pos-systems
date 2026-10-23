import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { Product, CartItem, SaleTransaction, SelectedModifier } from '../../models/product.model';
import { calcChange } from '../../core/money/money';

@Component({
  selector: 'app-pos-terminal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pos-terminal.component.html',
  styleUrl: './pos-terminal.component.css',
})
export class PosTerminalComponent {
  readonly productService = inject(ProductService);

  // Emits when a receipt is ready to display
  readonly orderCompleted = output<SaleTransaction>();
  readonly toastTriggered = output<{ message: string; type: 'success' | 'danger' | 'info' }>();

  // Cashier filters
  cashierCategory = signal<string>('All');
  cashierSearch = signal<string>('');

  // Modals state
  showCustomModal = signal<boolean>(false);
  showPaymentModal = signal<boolean>(false);

  // Drink & Food Customization state
  customizingProduct = signal<Product | null>(null);
  customSize = signal<'S' | 'M' | 'L'>('M');
  customDrinkType = signal<'Hot' | 'Iced' | 'Frappe'>('Iced');
  customSweetness = signal<'100%' | '75%' | '50%' | '25%' | '0%'>('100%');
  customIce = signal<'Normal' | 'Less' | 'Extra' | 'Hot'>('Normal');
  customAddOns = signal<SelectedModifier[]>([]);
  customNotes = signal<string>('');
  customQty = signal<number>(1);

  // Payment dialog state
  paymentTab = signal<'cash' | 'khqr' | 'card' | 'grab'>('cash');
  usdReceived = signal<number>(0);
  khrReceived = signal<number>(0);
  khqrCountdown = signal<number>(180);
  private khqrTimer: ReturnType<typeof setInterval> | null = null;

  readonly sweetnessOptions = ['100%', '75%', '50%', '25%', '0%'] as const;
  readonly iceOptions = ['Normal', 'Less', 'Extra', 'Hot'] as const;

  // Filtered cashier products
  cashierFilteredProducts = computed(() => {
    const list = this.productService.products();
    const cat = this.cashierCategory();
    const search = this.cashierSearch().trim().toLowerCase();

    return list.filter((p) => {
      const matchCat = cat === 'All' || p.categoryName.toLowerCase() === cat.toLowerCase();
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search) ||
        (p.khmerName && p.khmerName.toLowerCase().includes(search)) ||
        p.id.toString().includes(search);
      return matchCat && matchSearch;
    });
  });

  // Mixed Cash Payment change computation via money.ts
  mixedChange = computed(() => {
    const totalCents = this.productService.cartTotalCents();
    const paidUsdCents = Math.round((this.usdReceived() || 0) * 100);
    const paidKhr = this.khrReceived() || 0;
    const rate = this.productService.exchangeRate();

    return calcChange(totalCents, paidUsdCents, paidKhr, rate);
  });

  // Live total price in Customization Dialog
  customTotalPrice = computed(() => {
    const product = this.customizingProduct();
    if (!product) return 0;
    let base = product.price;
    if (this.customSize() === 'S') base -= 0.5;
    if (this.customSize() === 'L') base += 0.5;
    if (this.customDrinkType() === 'Frappe') base += 0.5;
    const addOnsPrice = this.customAddOns().reduce((s, a) => s + a.priceDelta, 0);
    return Math.max(0.5, +((base + addOnsPrice) * this.customQty()).toFixed(2));
  });

  get discountPercent(): number {
    return this.productService.discountPercent();
  }
  set discountPercent(val: number) {
    this.productService.discountPercent.set(val);
  }

  get customerName(): string {
    return this.productService.customerName();
  }
  set customerName(val: string) {
    this.productService.customerName.set(val);
  }

  onProductClick(product: Product): void {
    if (product.quantity <= 0) {
      this.toastTriggered.emit({ message: `"${product.name}" is out of stock!`, type: 'danger' });
      return;
    }

    if (product.allowCustomization) {
      this.customizingProduct.set(product);
      this.customSize.set('M');
      this.customDrinkType.set('Iced');
      this.customSweetness.set('100%');
      this.customIce.set('Normal');
      this.customAddOns.set([]);
      this.customNotes.set('');
      this.customQty.set(1);
      this.showCustomModal.set(true);
    } else {
      this.productService.addToCart(product);
      this.toastTriggered.emit({ message: `Added "${product.name}" to order`, type: 'success' });
    }
  }

  toggleAddOn(name: string, priceDelta: number): void {
    const list = this.customAddOns();
    const exists = list.some((a) => a.name === name);
    if (exists) {
      this.customAddOns.set(list.filter((a) => a.name !== name));
    } else {
      this.customAddOns.set([...list, { name, priceDelta }]);
    }
  }

  isAddOnSelected(name: string): boolean {
    return this.customAddOns().some((a) => a.name === name);
  }

  confirmCustomization(): void {
    const product = this.customizingProduct();
    if (product) {
      for (let i = 0; i < this.customQty(); i++) {
        this.productService.addToCart(product, {
          size: this.customSize(),
          drinkType: this.customDrinkType(),
          sweetness: this.customSweetness(),
          ice: this.customIce(),
          addOns: this.customAddOns(),
          notes: this.customNotes().trim(),
        });
      }
      this.toastTriggered.emit({
        message: `Added ${this.customQty()}x ${product.name} (${this.customSize()}, ${this.customDrinkType()})`,
        type: 'success',
      });
      this.showCustomModal.set(false);
      this.customizingProduct.set(null);
    }
  }

  closeCustomModal(): void {
    this.showCustomModal.set(false);
    this.customizingProduct.set(null);
  }

  updateCartQty(cartItemId: string, qty: number): void {
    this.productService.updateCartQuantity(cartItemId, qty);
  }

  removeFromCart(cartItemId: string): void {
    this.productService.removeFromCart(cartItemId);
  }

  clearCart(): void {
    if (this.productService.cart().length === 0) return;
    this.productService.clearCart();
    this.toastTriggered.emit({ message: 'Order cart cleared', type: 'info' });
  }

  holdOrder(): void {
    const success = this.productService.holdCurrentOrder();
    if (success) {
      this.toastTriggered.emit({ message: 'Order placed on hold (parked)!', type: 'info' });
    }
  }

  recallOrder(holdId: string): void {
    this.productService.recallHeldOrder(holdId);
    this.toastTriggered.emit({ message: 'Held order restored to active cart!', type: 'success' });
  }

  setDiscount(percent: number): void {
    this.productService.discountPercent.set(percent);
    this.toastTriggered.emit({
      message: percent > 0 ? `Applied ${percent}% Discount` : 'Removed Discount',
      type: 'info',
    });
  }

  // Payment flow
  openPaymentDialog(): void {
    if (this.productService.cart().length === 0) return;
    this.usdReceived.set(0);
    this.khrReceived.set(0);
    this.paymentTab.set('cash');
    this.showPaymentModal.set(true);
  }

  closePaymentDialog(): void {
    this.showPaymentModal.set(false);
    if (this.khqrTimer) {
      clearInterval(this.khqrTimer);
      this.khqrTimer = null;
    }
  }

  setQuickCashUsd(amount: number): void {
    this.usdReceived.set(amount);
  }

  setQuickCashKhr(amount: number): void {
    this.khrReceived.set(amount);
  }

  setExactCash(): void {
    this.usdReceived.set(this.productService.cartTotal());
    this.khrReceived.set(0);
  }

  switchToKhqrTab(): void {
    this.paymentTab.set('khqr');
    this.khqrCountdown.set(180);
    if (this.khqrTimer) clearInterval(this.khqrTimer);
    this.khqrTimer = setInterval(() => {
      this.khqrCountdown.update((c) => {
        if (c <= 1) {
          if (this.khqrTimer) clearInterval(this.khqrTimer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  simulateKhqrPaymentSuccess(): void {
    if (this.khqrTimer) {
      clearInterval(this.khqrTimer);
      this.khqrTimer = null;
    }
    this.finalizeSale('ABA KHQR', this.productService.cartTotal(), 0);
  }

  submitCashPayment(): void {
    const change = this.mixedChange();
    if (change.shortCents > 0) return;
    this.finalizeSale('Cash (Mixed USD/KHR)', this.usdReceived(), this.khrReceived());
  }

  submitCardOrGrabPayment(method: string): void {
    this.finalizeSale(method, this.productService.cartTotal(), 0);
  }

  finalizeSale(paymentMethod: string, paidUsd: number, paidKhr: number): void {
    this.closePaymentDialog();
    const txn = this.productService.completeSale(paymentMethod, paidUsd, paidKhr);
    this.orderCompleted.emit(txn);
    this.toastTriggered.emit({ message: `Order #${txn.orderNumber} completed!`, type: 'success' });
  }
}
