import Dexie, { Table } from 'dexie';

export interface DbProduct {
  id: string;
  productId: string;
  productName: string;
  nameKm?: string;
  quantity: number;
  price: number;
  amount: number;
  description: string;
  createdDate: string;
  categoryName: string;
  imageUrl: string;
  allowCustomization: boolean;
  station: 'bar' | 'kitchen';
  isSoldOut?: boolean;
}

export interface DbShift {
  id: string;
  shiftNo: number;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openFloatUsd: number;
  openFloatKhr: number;
  countedUsd?: number;
  countedKhr?: number;
  expectedUsd?: number;
  expectedKhr?: number;
  status: 'OPEN' | 'CLOSED';
}

export interface DbCashMovement {
  id: string;
  shiftId: string;
  type: 'IN' | 'OUT';
  amount: number;
  currency: 'USD' | 'KHR';
  reason: string;
  timestamp: string;
}

export interface DbOrder {
  id: string;
  receiptNo: string;
  queueNo: number;
  shiftId?: string;
  tableNumber?: string;
  orderType: 'Dine-in' | 'Take-away' | 'Delivery';
  status: 'DRAFT' | 'SENT' | 'PAID' | 'VOIDED';
  subtotal: number;
  discount: number;
  vat: number;
  grandTotalUsd: number;
  grandTotalKhr: number;
  exchangeRate: number;
  paymentMethod?: string;
  paidUsd?: number;
  paidKhr?: number;
  changeUsd?: number;
  changeKhr?: number;
  createdAt: string;
  paidAt?: string;
}

export interface DbCafeTable {
  id: string;
  tableNumber: string;
  zone: 'Indoor' | 'Outdoor' | 'Upstairs VIP';
  seats: number;
  status: 'Available' | 'Occupied' | 'Bill Printed' | 'Reserved';
  currentOrderId?: string;
  currentOrderTotal?: number;
  activeSince?: string;
}

export interface DbKitchenTicket {
  id: string;
  orderId: string;
  queueNo: number;
  orderType: string;
  tableNumber?: string;
  station: 'bar' | 'kitchen';
  itemsJson: string; // JSON array of items with modifiers
  status: 'PENDING' | 'PREPARING' | 'READY' | 'BUMPED';
  createdAt: string;
  bumpedAt?: string;
}

export interface DbAuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  reason: string;
  details: string;
}

export class BrownPosDb extends Dexie {
  products!: Table<DbProduct, string>;
  shifts!: Table<DbShift, string>;
  cashMovements!: Table<DbCashMovement, string>;
  orders!: Table<DbOrder, string>;
  cafeTables!: Table<DbCafeTable, string>;
  kitchenTickets!: Table<DbKitchenTicket, string>;
  auditLogs!: Table<DbAuditLog, string>;

  constructor() {
    super('BrownCafePosDB');
    this.version(1).stores({
      products: 'id, productId, productName, categoryName, station',
      shifts: 'id, shiftNo, status, openedAt',
      cashMovements: 'id, shiftId, timestamp',
      orders: 'id, receiptNo, queueNo, status, createdAt',
      cafeTables: 'id, tableNumber, zone, status',
      kitchenTickets: 'id, orderId, queueNo, station, status, createdAt',
      auditLogs: 'id, timestamp, action'
    });
  }
}

export const db = new BrownPosDb();
