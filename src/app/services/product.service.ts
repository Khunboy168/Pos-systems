import { Injectable, signal, computed, inject } from '@angular/core';
import {
  Product,
  CartItem,
  SaleTransaction,
  CafeTable,
  KitchenTicket,
  ShiftRecord,
  CashMovement,
  DenominationCounts,
  SelectedModifier,
} from '../models/product.model';
import { roundKhr, usdToKhr, calcChange, vatFromInclusive } from '../core/money/money';
import { BroadcastService } from '../core/realtime/broadcast.service';
import { db } from '../core/data/db';

const STORAGE_KEY = 'brown_pos_products_v4';
const TRANSACTIONS_KEY = 'brown_pos_sales_v4';
const TABLES_KEY = 'brown_pos_tables_v4';
const KITCHEN_KEY = 'brown_pos_kitchen_v4';
const SHIFTS_KEY = 'brown_pos_shifts_v4';
const MOVEMENTS_KEY = 'brown_pos_movements_v4';
const AUDIT_KEY = 'brown_pos_audit_v4';

export const INITIAL_PRODUCTS: Product[] = [
  // 5 ORIGINAL MIDTERM EXAM ITEMS (Preserved exactly for teacher rubric)
  {
    id: 1,
    name: 'Coca',
    khmerName: 'កូកាកូឡា កំប៉ុង',
    quantity: 300,
    price: 1.5,
    amount: 450.0,
    description: 'List product coca',
    createdDate: '15/05/2026',
    categoryName: 'Soft drink',
    imageUrl: 'assets/images/coca.svg',
    isDrink: true,
    allowCustomization: false,
    station: 'bar',
  },
  {
    id: 2,
    name: 'ABC',
    khmerName: 'ស្រាបៀរ អេប៊ីស៊ី ស្តោត',
    quantity: 1200,
    price: 2.7,
    amount: 3240.0,
    description: 'List product abc',
    createdDate: '27/04/2026',
    categoryName: 'Beer',
    imageUrl: 'assets/images/abc.svg',
    isDrink: true,
    allowCustomization: false,
    station: 'bar',
  },
  {
    id: 3,
    name: 'Cambodia Water',
    khmerName: 'ទឹកបរិសុទ្ធ កម្ពុជា',
    quantity: 3000,
    price: 1.2,
    amount: 3600.0,
    description: 'List product cambodia',
    createdDate: '27/04/2026',
    categoryName: 'Water',
    imageUrl: 'assets/images/cambodia-water.svg',
    isDrink: true,
    allowCustomization: false,
    station: 'bar',
  },
  {
    id: 4,
    name: 'Angkor',
    khmerName: 'ស្រាបៀរ អង្គរ កំប៉ុង',
    quantity: 800,
    price: 3.5,
    amount: 2800.0,
    description: 'List product angkor',
    createdDate: '15/05/2026',
    categoryName: 'Beer',
    imageUrl: 'assets/images/angkor.svg',
    isDrink: true,
    allowCustomization: false,
    station: 'bar',
  },
  {
    id: 5,
    name: 'Sting',
    khmerName: 'ស្ទីង ភេសជ្ជៈប៉ូវកម្លាំង',
    quantity: 888,
    price: 1.4,
    amount: 1243.2,
    description: 'List product sting',
    createdDate: '10/05/2026',
    categoryName: 'Soft drink',
    imageUrl: 'assets/images/sting.svg',
    isDrink: true,
    allowCustomization: false,
    station: 'bar',
  },

  // ESPRESSO & COFFEE MENU (Customizable: Size, Sugar, Ice, Add-ons)
  {
    id: 6,
    name: 'Iced Cafe Latte',
    khmerName: 'កាហ្វេទឹកដោះគោទឹកកក',
    quantity: 450,
    price: 2.5,
    amount: 1125.0,
    description: 'Double espresso with fresh steamed milk poured over crystal ice',
    createdDate: '18/05/2026',
    categoryName: 'Coffee',
    imageUrl: 'assets/images/coffee-latte.svg',
    isDrink: true,
    allowCustomization: true,
    station: 'bar',
  },
  {
    id: 7,
    name: 'Iced Americano',
    khmerName: 'កាហ្វេខ្មៅទឹកកក',
    quantity: 380,
    price: 2.0,
    amount: 760.0,
    description: 'Chilled spring water topped with bold freshly extracted espresso shots',
    createdDate: '18/05/2026',
    categoryName: 'Coffee',
    imageUrl: 'assets/images/iced-americano.svg',
    isDrink: true,
    allowCustomization: true,
    station: 'bar',
  },
  {
    id: 8,
    name: 'Hot Cappuccino',
    khmerName: 'កាពូឈីណូ ក្តៅ',
    quantity: 220,
    price: 2.5,
    amount: 550.0,
    description: 'Silky micro-foam with rich espresso and dusted cocoa latte art',
    createdDate: '19/05/2026',
    categoryName: 'Coffee',
    imageUrl: 'assets/images/cappuccino.svg',
    isDrink: true,
    allowCustomization: true,
    station: 'bar',
  },
  {
    id: 9,
    name: 'Caramel Macchiato',
    khmerName: 'ការ៉ាមែល ម៉ាគីយ៉ាតូ',
    quantity: 310,
    price: 3.0,
    amount: 930.0,
    description: 'Vanilla steamed milk marked with espresso and artisanal caramel drizzle',
    createdDate: '19/05/2026',
    categoryName: 'Coffee',
    imageUrl: 'assets/images/caramel-macchiato.svg',
    isDrink: true,
    allowCustomization: true,
    station: 'bar',
  },
  {
    id: 10,
    name: 'Khmer Condensed Milk Coffee',
    khmerName: 'កាហ្វេទឹកដោះគោខ្មែរ (បុរាណ)',
    quantity: 500,
    price: 1.75,
    amount: 875.0,
    description: 'Authentic rich roasted Khmer robusta with sweet Longevity condensed milk',
    createdDate: '20/05/2026',
    categoryName: 'Coffee',
    imageUrl: 'assets/images/khmer-coffee.svg',
    isDrink: true,
    allowCustomization: true,
    station: 'bar',
  },

  // TEA & FRAPPE SPECIALTIES
  {
    id: 11,
    name: 'Matcha Green Tea Latte',
    khmerName: 'តែបៃតងម៉ាត់ឆា',
    quantity: 320,
    price: 2.8,
    amount: 896.0,
    description: 'Uji Japanese organic matcha with sweet milk and ice',
    createdDate: '20/05/2026',
    categoryName: 'Tea & Frappe',
    imageUrl: 'assets/images/green-tea.svg',
    isDrink: true,
    allowCustomization: true,
    station: 'bar',
  },
  {
    id: 12,
    name: 'Brown Sugar Boba Tea',
    khmerName: 'តែទឹកដោះគោគុជស្ករត្នោត',
    quantity: 260,
    price: 2.75,
    amount: 715.0,
    description: 'Fresh milk tea infused with warm chewy brown sugar tapioca pearls',
    createdDate: '21/05/2026',
    categoryName: 'Tea & Frappe',
    imageUrl: 'assets/images/milk-tea.svg',
    isDrink: true,
    allowCustomization: true,
    station: 'bar',
  },
  {
    id: 13,
    name: 'Passion Fruit Iced Tea',
    khmerName: 'តែផ្លែស្រកានាគ/ផាសិន',
    quantity: 280,
    price: 2.2,
    amount: 616.0,
    description: 'Brewed jasmine green tea shaken with fresh real passion fruit seeds',
    createdDate: '21/05/2026',
    categoryName: 'Tea & Frappe',
    imageUrl: 'assets/images/passion-tea.svg',
    isDrink: true,
    allowCustomization: true,
    station: 'bar',
  },
  {
    id: 14,
    name: 'Fresh Young Coconut',
    khmerName: 'ដូងក្រអូប ស្រស់',
    quantity: 180,
    price: 1.75,
    amount: 315.0,
    description: 'Chilled natural organic sweet fragrant coconut water',
    createdDate: '22/05/2026',
    categoryName: 'Tea & Frappe',
    imageUrl: 'assets/images/fresh-coconut.svg',
    isDrink: true,
    allowCustomization: false,
    station: 'bar',
  },

  // BAKERY & DESSERTS
  {
    id: 15,
    name: 'French Butter Croissant',
    khmerName: 'នំបុ័ងក្រូសង់ប៊័រស្រស់',
    quantity: 140,
    price: 2.25,
    amount: 315.0,
    description: 'Artisanal flaky butter pastry baked fresh daily in store',
    createdDate: '22/05/2026',
    categoryName: 'Bakery & Snacks',
    imageUrl: 'assets/images/croissant.svg',
    isDrink: false,
    allowCustomization: false,
    station: 'kitchen',
  },
  {
    id: 16,
    name: 'Blueberry Cheesecake',
    khmerName: 'នំខេកឈីសប្លូប៊ឺរី',
    quantity: 85,
    price: 3.5,
    amount: 297.5,
    description: 'Rich New York style cream cheesecake topped with wild blueberry sauce',
    createdDate: '22/05/2026',
    categoryName: 'Bakery & Snacks',
    imageUrl: 'assets/images/cheesecake.svg',
    isDrink: false,
    allowCustomization: false,
    station: 'kitchen',
  },

  // KHMER FOOD & MEALS
  {
    id: 17,
    name: 'Cambodian Beef Lok Lak',
    khmerName: 'បាយសាច់គោឡុកឡាក់ពងមាន់',
    quantity: 95,
    price: 4.5,
    amount: 427.5,
    description: 'Tender wok-fried marinated beef cubes with egg and Kampot pepper lime dip',
    createdDate: '23/05/2026',
    categoryName: 'Food & Meals',
    imageUrl: 'assets/images/lok-lak.svg',
    isDrink: false,
    allowCustomization: false,
    station: 'kitchen',
  },
  {
    id: 18,
    name: 'Khmer Chicken Fried Rice',
    khmerName: 'បាយឆាសាច់មាន់ពងទាផ្កាយ',
    quantity: 110,
    price: 3.5,
    amount: 385.0,
    description: 'Wok-charred fragrant jasmine rice with organic chicken breast and sunny egg',
    createdDate: '23/05/2026',
    categoryName: 'Food & Meals',
    imageUrl: 'assets/images/fried-rice.svg',
    isDrink: false,
    allowCustomization: false,
    station: 'kitchen',
  },
  {
    id: 19,
    name: 'Cafe Club Sandwich & Fries',
    khmerName: 'នំប៉័ងក្លឹបសាំងវិច & ដំឡូងបារាំង',
    quantity: 125,
    price: 3.5,
    amount: 437.5,
    description: 'Triple toasted sandwich with smoked chicken, cheddar, egg, bacon and crispy fries',
    createdDate: '23/05/2026',
    categoryName: 'Food & Meals',
    imageUrl: 'assets/images/club-sandwich.svg',
    isDrink: false,
    allowCustomization: false,
    station: 'kitchen',
  },

  // MORE BEVERAGES & BEERS
  {
    id: 20,
    name: 'Hanuman Premium Beer',
    khmerName: 'ស្រាបៀរ ហនុមាន',
    quantity: 600,
    price: 2.8,
    amount: 1680.0,
    description: 'Award-winning Cambodian crafted smooth golden premium lager',
    createdDate: '24/05/2026',
    categoryName: 'Beer',
    imageUrl: 'assets/images/hanuman-beer.svg',
    isDrink: true,
    allowCustomization: false,
    station: 'bar',
  },
  {
    id: 21,
    name: 'Red Bull Energy Can',
    khmerName: 'រ៉េដប៊ូល ភេសជ្ជៈប៉ូវកម្លាំង',
    quantity: 500,
    price: 1.6,
    amount: 800.0,
    description: 'Invigorating energy booster with taurine and B-complex vitamins',
    createdDate: '24/05/2026',
    categoryName: 'Soft drink',
    imageUrl: 'assets/images/redbull.svg',
    isDrink: true,
    allowCustomization: false,
    station: 'bar',
  },
];

export const INITIAL_TABLES: CafeTable[] = [
  { id: 1, name: 'Table 01', area: 'Indoor', seats: 4, status: 'available' },
  { id: 2, name: 'Table 02', area: 'Indoor', seats: 2, status: 'occupied', orderTotal: 7.25, orderItemsCount: 3, occupiedSince: '18 min ago', guestCount: 2 },
  { id: 3, name: 'Table 03', area: 'Indoor', seats: 4, status: 'available' },
  { id: 4, name: 'Table 04', area: 'Indoor', seats: 6, status: 'available' },
  { id: 5, name: 'Garden 01', area: 'Outdoor', seats: 4, status: 'available' },
  { id: 6, name: 'Garden 02', area: 'Outdoor', seats: 4, status: 'occupied', orderTotal: 12.50, orderItemsCount: 4, occupiedSince: '12 min ago', guestCount: 4 },
  { id: 7, name: 'VIP Room 1', area: 'Upstairs VIP', seats: 8, status: 'bill_printed', orderTotal: 24.50, orderItemsCount: 6, occupiedSince: '45 min ago', guestCount: 6 },
  { id: 8, name: 'VIP Room 2', area: 'Upstairs VIP', seats: 10, status: 'reserved' },
];

export const INITIAL_KITCHEN_TICKETS: KitchenTicket[] = [
  {
    id: 'KOT-101',
    orderNumber: 101,
    orderType: 'Dine-in',
    tableName: 'Table 02',
    station: 'bar',
    timestamp: '14:40',
    createdAtMs: Date.now() - 4 * 60 * 1000,
    serverName: 'Bopha (Cashier 1)',
    status: 'preparing',
    items: [
      {
        cartItemId: 'item-1',
        product: INITIAL_PRODUCTS[5], // Iced Latte
        quantity: 2,
        size: 'L',
        drinkType: 'Iced',
        sweetness: '50%',
        ice: 'Less',
        addOns: [{ name: 'Oat Milk', priceDelta: 0.75 }],
        notes: 'Oat milk',
        unitPrice: 3.75,
        subtotal: 7.5,
      },
    ],
  },
  {
    id: 'KOT-102',
    orderNumber: 102,
    orderType: 'Takeaway',
    station: 'bar',
    timestamp: '14:48',
    createdAtMs: Date.now() - 11 * 60 * 1000,
    serverName: 'Vanna (Barista)',
    status: 'ready',
    items: [
      {
        cartItemId: 'item-3',
        product: INITIAL_PRODUCTS[10], // Matcha Green Tea
        quantity: 1,
        size: 'M',
        drinkType: 'Iced',
        sweetness: '25%',
        ice: 'Normal',
        addOns: [],
        notes: 'Less sweet',
        unitPrice: 2.8,
        subtotal: 2.8,
      },
    ],
  },
];

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly bus = inject(BroadcastService);

  readonly products = signal<Product[]>(this.loadProducts());
  readonly cart = signal<CartItem[]>([]);
  readonly tables = signal<CafeTable[]>(this.loadTables());
  readonly kitchenTickets = signal<KitchenTicket[]>(this.loadKitchenTickets());
  readonly transactions = signal<SaleTransaction[]>(this.loadTransactions());
  readonly shifts = signal<ShiftRecord[]>(this.loadShifts());
  readonly cashMovements = signal<CashMovement[]>(this.loadMovements());

  // Current Active Shift
  readonly currentShift = signal<ShiftRecord | null>(this.initCurrentShift());

  // Held Orders
  readonly heldOrders = signal<{ id: string; name: string; items: CartItem[]; timestamp: string }[]>([]);

  // System Settings
  readonly exchangeRate = signal<number>(4100); // 1 USD = 4,100 KHR
  readonly vatPercent = signal<number>(10);     // 10% Cambodia VAT
  readonly currentLanguage = signal<'en' | 'km'>('en');

  // Active Order Context
  readonly activeOrderType = signal<'Dine-in' | 'Takeaway' | 'Delivery'>('Dine-in');
  readonly selectedTable = signal<string>('Table 01');
  readonly activeCashier = signal<string>('Bopha (Cashier 1)');
  readonly customerName = signal<string>('');
  readonly discountPercent = signal<number>(0);

  // Search & Filter state for Exam Table
  readonly searchTerm = signal<string>('');
  readonly selectedCategory = signal<string>('All Category');

  // Last bumped ticket for Recall action
  readonly lastBumpedTicket = signal<KitchenTicket | null>(null);

  constructor() {
    // Listen to real-time events from other tabs
    this.bus.on('ticket.bumped', (payload: { ticketId: string }) => {
      this.kitchenTickets.update((list) =>
        list.map((t) => (t.id === payload.ticketId ? { ...t, status: 'ready' } : t))
      );
    });

    this.bus.on('table.status_changed', (payload: { tableName: string; status: CafeTable['status'] }) => {
      this.tables.update((list) =>
        list.map((tbl) => (tbl.name === payload.tableName ? { ...tbl, status: payload.status } : tbl))
      );
    });
  }

  // Filtered Products computation for Midterm Exam Table
  readonly filteredProducts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const category = this.selectedCategory();
    let list = this.products();

    if (category && category !== 'All Category') {
      list = list.filter((p) => p.categoryName.toLowerCase() === category.toLowerCase());
    }

    if (term) {
      list = list.filter((p) => {
        const idStr = p.id.toString();
        const nameMatches = p.name.toLowerCase().includes(term);
        const khmerMatches = p.khmerName?.toLowerCase().includes(term) ?? false;
        const idMatches = idStr.includes(term);
        return idMatches || nameMatches || khmerMatches;
      });
    }

    return list;
  });

  // Inventory stats
  readonly totalProducts = computed(() => this.products().length);
  readonly totalUnits = computed(() =>
    this.products().reduce((sum, p) => sum + (Number(p.quantity) || 0), 0)
  );
  readonly totalInventoryValue = computed(() =>
    this.products().reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  );
  readonly categories = computed(() => {
    const set = new Set<string>();
    this.products().forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set).sort();
  });

  // Cart calculations with Discounts and Dual-Currency (Integer Cents & 100 Riels)
  readonly cartCount = computed(() => this.cart().reduce((sum, item) => sum + item.quantity, 0));
  readonly cartSubtotal = computed(() =>
    +this.cart().reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)
  );
  readonly cartSubtotalCents = computed(() => Math.round(this.cartSubtotal() * 100));
  readonly cartDiscountAmount = computed(() =>
    +((this.cartSubtotal() * this.discountPercent()) / 100).toFixed(2)
  );
  readonly cartDiscountCents = computed(() => Math.round(this.cartDiscountAmount() * 100));
  readonly cartAfterDiscount = computed(() =>
    Math.max(0, +(this.cartSubtotal() - this.cartDiscountAmount()).toFixed(2))
  );
  readonly cartTax = computed(() => +(this.cartAfterDiscount() * 0.1).toFixed(2)); // 10% VAT
  readonly cartTotal = computed(() => +(this.cartAfterDiscount() + this.cartTax()).toFixed(2));
  readonly cartTotalCents = computed(() => Math.round(this.cartTotal() * 100));
  readonly cartTotalKhr = computed(() =>
    usdToKhr(this.cartTotalCents(), this.exchangeRate())
  );

  // Persistence Helpers
  private loadProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return [...INITIAL_PRODUCTS];
  }

  private saveProducts(products: Product[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      console.error(e);
    }
  }

  private loadTables(): CafeTable[] {
    try {
      const data = localStorage.getItem(TABLES_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn(e);
    }
    return [...INITIAL_TABLES];
  }

  private saveTables(tables: CafeTable[]): void {
    try {
      localStorage.setItem(TABLES_KEY, JSON.stringify(tables));
    } catch (e) {
      console.error(e);
    }
  }

  private loadKitchenTickets(): KitchenTicket[] {
    try {
      const data = localStorage.getItem(KITCHEN_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn(e);
    }
    return [...INITIAL_KITCHEN_TICKETS];
  }

  private saveKitchenTickets(tickets: KitchenTicket[]): void {
    try {
      localStorage.setItem(KITCHEN_KEY, JSON.stringify(tickets));
    } catch (e) {
      console.error(e);
    }
  }

  private loadTransactions(): SaleTransaction[] {
    try {
      const data = localStorage.getItem(TRANSACTIONS_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn(e);
    }
    return [];
  }

  private saveTransactions(list: SaleTransaction[]): void {
    try {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  }

  private loadShifts(): ShiftRecord[] {
    try {
      const data = localStorage.getItem(SHIFTS_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn(e);
    }
    return [];
  }

  private saveShifts(list: ShiftRecord[]): void {
    try {
      localStorage.setItem(SHIFTS_KEY, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  }

  private loadMovements(): CashMovement[] {
    try {
      const data = localStorage.getItem(MOVEMENTS_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn(e);
    }
    return [];
  }

  private saveMovements(list: CashMovement[]): void {
    try {
      localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  }

  private initCurrentShift(): ShiftRecord {
    const list = this.loadShifts();
    const open = list.find((s) => s.status === 'OPEN');
    if (open) return open;

    // Default open shift
    const defaultShift: ShiftRecord = {
      id: 'SHIFT-001',
      shiftNo: 1,
      cashierName: 'Bopha (Cashier 1)',
      openedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      openFloatUsd: 20.0,
      openFloatKhr: 40000,
      totalSalesUsd: 0,
      totalSalesKhr: 0,
      orderCount: 0,
      status: 'OPEN',
    };
    return defaultShift;
  }

  // --- Shift & Cash Drawer Operations ---
  openShift(cashierName: string, openUsd: number, openKhr: number): ShiftRecord {
    const nextShiftNo = this.shifts().length + 1;
    const shift: ShiftRecord = {
      id: 'SHIFT-' + String(nextShiftNo).padStart(3, '0'),
      shiftNo: nextShiftNo,
      cashierName,
      openedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      openFloatUsd: openUsd,
      openFloatKhr: openKhr,
      totalSalesUsd: 0,
      totalSalesKhr: 0,
      orderCount: 0,
      status: 'OPEN',
    };
    this.currentShift.set(shift);
    const updated = [shift, ...this.shifts().filter((s) => s.id !== shift.id)];
    this.shifts.set(updated);
    this.saveShifts(updated);
    this.bus.publish('shift.changed', { shiftId: shift.id, status: 'OPEN' });
    return shift;
  }

  recordCashMovement(type: 'IN' | 'OUT', amount: number, currency: 'USD' | 'KHR', reason: string): CashMovement {
    const move: CashMovement = {
      id: 'CM-' + Date.now().toString().slice(-6),
      shiftId: this.currentShift()?.id || 'SHIFT-001',
      type,
      amount,
      currency,
      reason,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [move, ...this.cashMovements()];
    this.cashMovements.set(updated);
    this.saveMovements(updated);
    return move;
  }

  closeShift(countedUsd: number, countedKhr: number): ShiftRecord {
    const shift = this.currentShift() || this.initCurrentShift();
    const rate = this.exchangeRate();

    // Sum cash movements
    const movements = this.cashMovements().filter((m) => m.shiftId === shift.id);
    let movementUsd = 0;
    let movementKhr = 0;
    for (const m of movements) {
      if (m.currency === 'USD') {
        movementUsd += m.type === 'IN' ? m.amount : -m.amount;
      } else {
        movementKhr += m.type === 'IN' ? m.amount : -m.amount;
      }
    }

    const expectedUsd = +(shift.openFloatUsd + shift.totalSalesUsd + movementUsd).toFixed(2);
    const expectedKhr = shift.openFloatKhr + shift.totalSalesKhr + movementKhr;
    const diffUsd = +(countedUsd - expectedUsd).toFixed(2);
    const diffKhr = countedKhr - expectedKhr;

    const closed: ShiftRecord = {
      ...shift,
      closedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      countedUsd,
      countedKhr,
      expectedUsd,
      expectedKhr,
      diffUsd,
      diffKhr,
      status: 'CLOSED',
    };

    this.currentShift.set(null);
    const updated = this.shifts().map((s) => (s.id === shift.id ? closed : s));
    this.shifts.set(updated);
    this.saveShifts(updated);
    this.bus.publish('shift.changed', { shiftId: shift.id, status: 'CLOSED' });
    return closed;
  }

  // --- CRUD Operations for Exam Table ---
  addProduct(newProduct: Omit<Product, 'amount'>): Product {
    const list = this.products();
    const id =
      newProduct.id && newProduct.id > 0
        ? newProduct.id
        : list.length > 0
          ? Math.max(...list.map((p) => p.id)) + 1
          : 1;

    const quantity = Math.max(0, Number(newProduct.quantity) || 0);
    const price = Math.max(0, Number(newProduct.price) || 0);
    const amount = Number((quantity * price).toFixed(2));

    const item: Product = {
      id,
      name: newProduct.name.trim() || 'Untitled Product',
      khmerName: newProduct.khmerName?.trim() || '',
      quantity,
      price,
      amount,
      description: newProduct.description?.trim() || `List product ${newProduct.name.toLowerCase()}`,
      createdDate: newProduct.createdDate || this.formatCurrentDate(),
      categoryName: newProduct.categoryName || 'Coffee',
      imageUrl: newProduct.imageUrl || 'assets/images/coffee-latte.svg',
      isDrink: newProduct.isDrink ?? true,
      allowCustomization:
        newProduct.allowCustomization ??
        (newProduct.categoryName === 'Coffee' || newProduct.categoryName === 'Tea & Frappe'),
      station: newProduct.station || (newProduct.categoryName === 'Food & Meals' || newProduct.categoryName === 'Bakery & Snacks' ? 'kitchen' : 'bar'),
    };

    const updatedList = [item, ...list];
    this.products.set(updatedList);
    this.saveProducts(updatedList);
    this.bus.publish('product.updated', { productId: item.id });
    return item;
  }

  updateProduct(id: number, changes: Partial<Product>): boolean {
    const list = this.products();
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) return false;

    const current = list[index];
    const quantity = changes.quantity !== undefined ? Math.max(0, Number(changes.quantity)) : current.quantity;
    const price = changes.price !== undefined ? Math.max(0, Number(changes.price)) : current.price;
    const amount = Number((quantity * price).toFixed(2));

    const updatedItem: Product = {
      ...current,
      ...changes,
      quantity,
      price,
      amount,
    };

    const nextList = [...list];
    nextList[index] = updatedItem;
    this.products.set(nextList);
    this.saveProducts(nextList);
    this.bus.publish('product.updated', { productId: id });
    return true;
  }

  deleteProduct(id: number): boolean {
    const list = this.products();
    const nextList = list.filter((p) => p.id !== id);
    if (nextList.length === list.length) return false;

    this.products.set(nextList);
    this.saveProducts(nextList);
    return true;
  }

  resetToDefault(): void {
    this.products.set([...INITIAL_PRODUCTS]);
    this.saveProducts([...INITIAL_PRODUCTS]);
    this.tables.set([...INITIAL_TABLES]);
    this.saveTables([...INITIAL_TABLES]);
    this.kitchenTickets.set([...INITIAL_KITCHEN_TICKETS]);
    this.saveKitchenTickets([...INITIAL_KITCHEN_TICKETS]);
    this.searchTerm.set('');
    this.selectedCategory.set('All Category');
    this.discountPercent.set(0);
    this.customerName.set('');
  }

  // --- Cart Operations ---
  addToCart(
    product: Product,
    options?: {
      size?: 'S' | 'M' | 'L';
      drinkType?: 'Hot' | 'Iced' | 'Frappe';
      sweetness?: '100%' | '75%' | '50%' | '25%' | '0%';
      ice?: 'Normal' | 'Less' | 'Extra' | 'Hot';
      addOns?: SelectedModifier[];
      notes?: string;
    }
  ): void {
    const size = options?.size || 'M';
    const drinkType = options?.drinkType || 'Iced';
    const sweetness = options?.sweetness || '100%';
    const ice = options?.ice || 'Normal';
    const addOns = options?.addOns || [];
    const notes = options?.notes || '';

    // Price calculation: S = -$0.50, M = $0, L = +$0.50; Frappe = +$0.50
    let sizeOffset = 0;
    if (size === 'S') sizeOffset = -0.5;
    if (size === 'L') sizeOffset = 0.5;

    const frappeOffset = drinkType === 'Frappe' ? 0.5 : 0;
    const addOnsTotal = addOns.reduce((sum, a) => sum + a.priceDelta, 0);

    const unitPrice = Math.max(0.5, +(product.price + sizeOffset + frappeOffset + addOnsTotal).toFixed(2));
    const addOnsKey = addOns.map((a) => a.name).sort().join(',');
    const cartItemId = `${product.id}_${size}_${drinkType}_${sweetness}_${ice}_${addOnsKey}_${notes}`;

    const currentCart = this.cart();
    const existingIndex = currentCart.findIndex((i) => i.cartItemId === cartItemId);

    let nextCart: CartItem[];
    if (existingIndex > -1) {
      nextCart = [...currentCart];
      const item = nextCart[existingIndex];
      const newQty = item.quantity + 1;
      nextCart[existingIndex] = {
        ...item,
        quantity: newQty,
        subtotal: +(newQty * unitPrice).toFixed(2),
      };
    } else {
      nextCart = [
        ...currentCart,
        {
          cartItemId,
          product,
          quantity: 1,
          size,
          drinkType,
          sweetness,
          ice,
          addOns,
          notes,
          unitPrice,
          subtotal: unitPrice,
        },
      ];
    }
    this.cart.set(nextCart);
    this.bus.publish('cart.updated', {
      count: this.cartCount(),
      totalUsd: this.cartTotal(),
      totalKhr: this.cartTotalKhr(),
    });
  }

  updateCartQuantity(cartItemId: string, qty: number): void {
    if (qty <= 0) {
      this.removeFromCart(cartItemId);
      return;
    }
    const nextCart = this.cart().map((item) => {
      if (item.cartItemId === cartItemId) {
        return {
          ...item,
          quantity: qty,
          subtotal: +(qty * item.unitPrice).toFixed(2),
        };
      }
      return item;
    });
    this.cart.set(nextCart);
    this.bus.publish('cart.updated', {
      count: this.cartCount(),
      totalUsd: this.cartTotal(),
      totalKhr: this.cartTotalKhr(),
    });
  }

  removeFromCart(cartItemId: string): void {
    this.cart.set(this.cart().filter((i) => i.cartItemId !== cartItemId));
    this.bus.publish('cart.updated', {
      count: this.cartCount(),
      totalUsd: this.cartTotal(),
      totalKhr: this.cartTotalKhr(),
    });
  }

  clearCart(): void {
    this.cart.set([]);
    this.discountPercent.set(0);
    this.customerName.set('');
    this.bus.publish('cart.updated', { count: 0, totalUsd: 0, totalKhr: 0 });
  }

  // --- Hold & Recall Orders ---
  holdCurrentOrder(): boolean {
    if (this.cart().length === 0) return false;
    const holdId = 'HOLD-' + Math.floor(Math.random() * 899 + 100);
    const holdName = (this.activeOrderType() === 'Dine-in' ? this.selectedTable() : this.customerName()) || 'Customer #' + holdId;
    const held = {
      id: holdId,
      name: holdName,
      items: [...this.cart()],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    this.heldOrders.update((list) => [held, ...list]);
    this.clearCart();
    return true;
  }

  recallHeldOrder(holdId: string): void {
    const list = this.heldOrders();
    const item = list.find((h) => h.id === holdId);
    if (item) {
      this.cart.set([...item.items]);
      this.heldOrders.set(list.filter((h) => h.id !== holdId));
      this.bus.publish('cart.updated', {
        count: this.cartCount(),
        totalUsd: this.cartTotal(),
        totalKhr: this.cartTotalKhr(),
      });
    }
  }

  // --- Kitchen Display System (KOT / KDS) ---
  sendToKitchen(): KitchenTicket[] {
    if (this.cart().length === 0) return [];

    const nextOrderNum =
      this.kitchenTickets().length > 0
        ? Math.max(...this.kitchenTickets().map((t) => t.orderNumber)) + 1
        : 103;

    // Split tickets by station: Bar vs Kitchen
    const barItems = this.cart().filter((i) => i.product.station === 'bar' || i.product.isDrink);
    const kitchenItems = this.cart().filter((i) => i.product.station === 'kitchen' || !i.product.isDrink);

    const generatedTickets: KitchenTicket[] = [];

    if (barItems.length > 0) {
      generatedTickets.push({
        id: `KOT-${nextOrderNum}-BAR`,
        orderNumber: nextOrderNum,
        orderType: this.activeOrderType(),
        tableName: this.activeOrderType() === 'Dine-in' ? this.selectedTable() : undefined,
        station: 'bar',
        items: barItems,
        status: 'pending',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAtMs: Date.now(),
        serverName: this.activeCashier(),
      });
    }

    if (kitchenItems.length > 0) {
      generatedTickets.push({
        id: `KOT-${nextOrderNum}-KIT`,
        orderNumber: nextOrderNum,
        orderType: this.activeOrderType(),
        tableName: this.activeOrderType() === 'Dine-in' ? this.selectedTable() : undefined,
        station: 'kitchen',
        items: kitchenItems,
        status: 'pending',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAtMs: Date.now(),
        serverName: this.activeCashier(),
      });
    }

    const nextTickets = [...generatedTickets, ...this.kitchenTickets()];
    this.kitchenTickets.set(nextTickets);
    this.saveKitchenTickets(nextTickets);

    if (this.activeOrderType() === 'Dine-in' && this.selectedTable()) {
      this.setTableStatus(this.selectedTable(), 'occupied', this.cartTotal(), this.cartCount());
    }

    this.bus.publish('order.sent', { orderNumber: nextOrderNum, ticketsCount: generatedTickets.length });
    return generatedTickets;
  }

  updateTicketStatus(ticketId: string, status: 'pending' | 'preparing' | 'ready'): void {
    const list = this.kitchenTickets().map((t) => (t.id === ticketId ? { ...t, status } : t));
    this.kitchenTickets.set(list);
    this.saveKitchenTickets(list);
    this.bus.publish('ticket.bumped', { ticketId });
  }

  bumpTicket(ticketId: string): void {
    const ticket = this.kitchenTickets().find((t) => t.id === ticketId);
    if (ticket) {
      this.lastBumpedTicket.set(ticket);
      this.updateTicketStatus(ticketId, 'ready');
    }
  }

  recallBumpedTicket(): KitchenTicket | null {
    const ticket = this.lastBumpedTicket();
    if (!ticket) return null;
    this.updateTicketStatus(ticket.id, 'preparing');
    this.lastBumpedTicket.set(null);
    return ticket;
  }

  // --- Table Operations ---
  setTableStatus(
    tableName: string,
    status: 'available' | 'occupied' | 'bill_printed' | 'reserved',
    total = 0,
    count = 0
  ): void {
    const list = this.tables().map((t) => {
      if (t.name === tableName) {
        return {
          ...t,
          status,
          orderTotal: status === 'occupied' || status === 'bill_printed' ? total : 0,
          orderItemsCount: status === 'occupied' || status === 'bill_printed' ? count : 0,
          occupiedSince: status === 'occupied' ? 'Just now' : t.occupiedSince,
        };
      }
      return t;
    });
    this.tables.set(list);
    this.saveTables(list);
    this.bus.publish('table.status_changed', { tableName, status });
  }

  // --- Complete Sale / Cambodian Mixed Cash Checkout ---
  completeSale(
    paymentMethod: string,
    paidUsd: number,
    paidKhr: number = 0
  ): SaleTransaction {
    const subtotal = this.cartSubtotal();
    const discountPercent = this.discountPercent();
    const discountAmount = this.cartDiscountAmount();
    const tax = this.cartTax();
    const total = this.cartTotal();
    const rate = this.exchangeRate();

    const totalCents = Math.round(total * 100);
    const paidUsdCents = Math.round(paidUsd * 100);

    // Calculate change using core/money/money.ts
    const changeCalc = calcChange(totalCents, paidUsdCents, paidKhr, rate);
    const changeUsd = changeCalc.changeUsd;
    const changeKhr = changeCalc.changeKhr;

    const nextOrderNum =
      this.transactions().length > 0
        ? Math.max(...this.transactions().map((t) => t.orderNumber)) + 1
        : 1001;

    const queueNo = (nextOrderNum % 1000) || 1;
    const dateStr = this.formatCurrentDate().replace(/\//g, '');
    const receiptNo = `BC-${dateStr}-${String(queueNo).padStart(4, '0')}`;

    const transaction: SaleTransaction = {
      id: 'INV-' + Date.now().toString().slice(-6),
      receiptNo,
      queueNo,
      orderNumber: nextOrderNum,
      orderType: this.activeOrderType(),
      tableName: this.activeOrderType() === 'Dine-in' ? this.selectedTable() : undefined,
      customerName: this.customerName().trim() || undefined,
      date: new Date().toLocaleString(),
      items: [...this.cart()],
      subtotal,
      discountPercent,
      discountAmount,
      tax,
      total,
      totalKhr: usdToKhr(totalCents, rate),
      exchangeRate: rate,
      paidUsd,
      paidKhr,
      changeUsd,
      changeKhr,
      paymentMethod,
      cashierName: this.activeCashier(),
    };

    // Deduct stock for inventory
    const productList = [...this.products()];
    for (const item of this.cart()) {
      const pIdx = productList.findIndex((p) => p.id === item.product.id);
      if (pIdx > -1) {
        const newQty = Math.max(0, productList[pIdx].quantity - item.quantity);
        productList[pIdx] = {
          ...productList[pIdx],
          quantity: newQty,
          amount: Number((newQty * productList[pIdx].price).toFixed(2)),
        };
      }
    }
    this.products.set(productList);
    this.saveProducts(productList);

    // Update shift metrics
    const currentShift = this.currentShift();
    if (currentShift) {
      const updatedShift: ShiftRecord = {
        ...currentShift,
        totalSalesUsd: +(currentShift.totalSalesUsd + total).toFixed(2),
        totalSalesKhr: currentShift.totalSalesKhr + usdToKhr(totalCents, rate),
        orderCount: currentShift.orderCount + 1,
      };
      this.currentShift.set(updatedShift);
      const updatedShifts = this.shifts().map((s) => (s.id === currentShift.id ? updatedShift : s));
      this.shifts.set(updatedShifts);
      this.saveShifts(updatedShifts);
    }

    // Save transaction
    const updatedTxns = [transaction, ...this.transactions()];
    this.transactions.set(updatedTxns);
    this.saveTransactions(updatedTxns);

    // Auto-generate KOT ticket if not sent yet
    this.sendToKitchen();

    // Release table if Dine-in
    if (transaction.tableName) {
      this.setTableStatus(transaction.tableName, 'available');
    }

    this.clearCart();
    this.bus.publish('order.paid', { receiptNo: transaction.receiptNo, totalUsd: total });
    return transaction;
  }

  formatCurrentDate(): string {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
