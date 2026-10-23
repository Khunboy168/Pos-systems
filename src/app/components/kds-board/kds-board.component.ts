import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { KitchenTicket } from '../../models/product.model';

@Component({
  selector: 'app-kds-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kds-board.component.html',
  styleUrl: './kds-board.component.css',
})
export class KdsBoardComponent {
  readonly productService = inject(ProductService);

  readonly toastTriggered = output<{ message: string; type: 'success' | 'danger' | 'info' }>();

  kdsStationFilter = signal<'all' | 'bar' | 'kitchen'>('all');

  filteredKitchenTickets = computed(() => {
    const filter = this.kdsStationFilter();
    const tickets = this.productService.kitchenTickets();
    if (filter === 'all') return tickets;
    return tickets.filter((t) => t.station === filter);
  });

  bumpTicket(ticket: KitchenTicket): void {
    this.productService.bumpTicket(ticket.id);
    this.toastTriggered.emit({
      message: `Ticket #${ticket.orderNumber} BUMPED (Ready to serve!)`,
      type: 'success',
    });
  }

  recallLastTicket(): void {
    const recalled = this.productService.recallBumpedTicket();
    if (recalled) {
      this.toastTriggered.emit({ message: `Ticket #${recalled.orderNumber} recalled to board!`, type: 'info' });
    } else {
      this.toastTriggered.emit({ message: 'No recently bumped ticket to recall', type: 'info' });
    }
  }

  getTicketAgeMinutes(createdAtMs: number): number {
    return Math.floor((Date.now() - createdAtMs) / (60 * 1000));
  }

  getTicketAgeClass(createdAtMs: number): string {
    const mins = this.getTicketAgeMinutes(createdAtMs);
    if (mins >= 10) return 'ticket-overdue';
    if (mins >= 5) return 'ticket-warning';
    return 'ticket-fresh';
  }
}
