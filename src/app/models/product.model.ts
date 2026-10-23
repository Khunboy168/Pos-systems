export interface Product {
  id: number;
  name: string;
  khmerName?: string;
  quantity: number;
  price: number;
  amount: number;
  description: string;
  createdDate: string;
  categoryName: string;
  imageUrl: string;
  isDrink?: boolean;
  allowCustomization?: boolean;
  station?: 'bar' | 'kitchen';
  isSoldOut?: boolean;
}

export interface SelectedModifier {
  name: string;
  priceDelta: number;
}

export interface CartItem {
  cartItemId: string;
  product: Product;
  quantity: number;
  size: 'S' | 'M' | 'L';
  drinkType: 'Hot' | 'Iced' | 'Frappe';
  sweetness: '100%' | '75%' | '50%' | '25%' | '0%';
  ice: 'Normal' | 'Less' | 'Extra' | 'Hot';
  addOns: SelectedModifier[];
  notes: string;
  unitPrice: number;
  subtotal: number;
}

export interface CafeTable {
  id: number;
  name: string;
  area: 'Indoor' | 'Outdoor' | 'Upstairs VIP';
  seats: number;
  status: 'available' | 'occupied' | 'bill_printed' | 'reserved';
  orderTotal?: number;
  orderItemsCount?: number;
  occupiedSince?: string;
  guestCount?: number;
}

export interface KitchenTicket {
  id: string;
  orderNumber: number;
  orderType: 'Dine-in' | 'Takeaway' | 'Delivery';
  tableName?: string;
  station: 'bar' | 'kitchen';
  items: CartItem[];
  status: 'pending' | 'preparing' | 'ready';
  timestamp: string;
  createdAtMs: number;
  serverName: string;
}

export interface DenominationCounts {
  usd1: number;
  usd5: number;
  usd10: number;
  usd20: number;
  usd50: number;
  usd100: number;
  khr100: number;
  khr500: number;
  khr1000: number;
  khr2000: number;
  khr5000: number;
  khr10000: number;
  khr20000: number;
  khr50000: number;
  khr100000: number;
}

export interface CashMovement {
  id: string;
  shiftId: string;
  type: 'IN' | 'OUT';
  amount: number;
  currency: 'USD' | 'KHR';
  reason: string;
  timestamp: string;
}

export interface ShiftRecord {
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
  diffUsd?: number;
  diffKhr?: number;
  totalSalesUsd: number;
  totalSalesKhr: number;
  orderCount: number;
  status: 'OPEN' | 'CLOSED';
}

export interface SaleTransaction {
  id: string;
  receiptNo: string;
  orderNumber: number;
  orderType: 'Dine-in' | 'Takeaway' | 'Delivery';
  tableName?: string;
  customerName?: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  tax: number;
  total: number;
  totalKhr: number;
  exchangeRate: number;
  paidUsd: number;
  paidKhr: number;
  changeUsd: number;
  changeKhr: number;
  paymentMethod: string;
  cashierName: string;
  queueNo: number;
}
