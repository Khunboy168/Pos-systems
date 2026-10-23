import { Injectable } from '@angular/core';

export type PosEventType =
  | 'order.created'
  | 'order.sent'
  | 'order.paid'
  | 'ticket.bumped'
  | 'ticket.recalled'
  | 'table.status_changed'
  | 'cart.updated'
  | 'shift.changed'
  | 'product.updated';

export interface PosBroadcastMessage<T = unknown> {
  type: PosEventType;
  payload: T;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class BroadcastService {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<PosEventType, Array<(payload: unknown) => void>> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('brown-pos');
        this.channel.onmessage = (event: MessageEvent<PosBroadcastMessage>) => {
          this.handleIncoming(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported or failed to initialize:', err);
      }
    }
  }

  publish<T>(type: PosEventType, payload: T): void {
    const message: PosBroadcastMessage<T> = {
      type,
      payload,
      timestamp: Date.now()
    };
    if (this.channel) {
      this.channel.postMessage(message);
    }
    // Also dispatch to local listeners on this tab
    this.handleIncoming(message);
  }

  on<T>(type: PosEventType, callback: (payload: T) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    const handlers = this.listeners.get(type)!;
    handlers.push(callback as (payload: unknown) => void);

    return () => {
      const idx = handlers.indexOf(callback as (payload: unknown) => void);
      if (idx > -1) {
        handlers.splice(idx, 1);
      }
    };
  }

  private handleIncoming(message: PosBroadcastMessage): void {
    if (!message || !message.type) return;
    const handlers = this.listeners.get(message.type);
    if (handlers) {
      handlers.forEach(h => {
        try {
          h(message.payload);
        } catch (e) {
          console.error(`Error in broadcast handler for ${message.type}:`, e);
        }
      });
    }
  }
}
