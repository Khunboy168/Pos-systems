# Brown Cafe POS — System Concept & Build Spec

Oct 22, 2026 · @Khun

## 1. Concept — what makes it a "real" Cambodian café POS

A real café POS in Cambodia is built around one fast cashier screen, dual currency (USD + KHR), KHQR payment, and a shift that must balance at closing. Everything else (tables, kitchen, stock, reports) feeds from orders created on that screen.

What you see in shops in Phnom Penh and Siem Reap (Brown, Amazon, Tube, local milk-tea shops) that this system must copy:

| Real-world behaviour | What it means for your system |
| --- | --- |
| Prices shown in $ and ៛ | Every total shows USD and KHR using a configurable exchange rate (e.g. 4,100 ៛ = $1). KHR is rounded to the nearest 100 ៛ because there is no smaller note. |
| Customer pays in mixed cash | Cashier can enter USD received + KHR received together; change is calculated and can be given in USD + KHR. |
| "Scan ABA / KHQR" | Dynamic KHQR with the exact amount on screen and on the receipt; payment auto-confirms when the bank reports it. |
| Sugar %, ice level, size | Every drink has modifiers: Size S/M/L, Hot/Iced/Frappe, Sugar 0/25/50/75/100%, Ice less/normal/extra, add-ons (extra shot, boba, cheese foam, oat milk). |
| Order number called out / on the cup | Each order gets a short daily queue number (#001–#999) printed on receipt and on a cup sticker. |
| Barista sees orders on a screen or slip | Orders route to stations: Bar (drinks) and Kitchen (food), each with its own KDS screen or printer. |
| Wi-Fi password on the receipt | Receipt footer is editable: Wi-Fi, Facebook/Telegram page, thank-you message in Khmer + English. |
| Grab / delivery orders | Order type Dine-in / Take-away / Delivery, with a separate price list per delivery platform (platform markup). |
| Owner checks sales on Telegram | Telegram bot sends shift-close report, daily sales, low-stock alerts and void/discount alerts to the owner's group. |
| Internet drops | Everything runs in the browser with local data, so cash sales never stop, even with no internet. |
| Cashier needs manager for void | Void, refund, discount above limit and reopening a paid bill need a manager PIN. |
| VAT invoice | Optional 10% VAT, shop VAT TIN on receipt, prices set as VAT-inclusive or exclusive. |

**Your current screen is a good admin back-office page.** The main change: separate **Menu items** (what you sell: Iced Latte) from **Ingredients/stock** (what you buy: coffee beans, milk, cups). Retail items like Coca or ABC beer can still track stock 1:1 as "retail" items. This is how real inventory and cost-of-goods reports work.

The system has two faces:

- **Back office** (manager/owner, mouse + keyboard): products, recipes, stock, staff, reports, settings — your current page.
- **Front of house** (cashier/waiter/barista, touchscreen): POS terminal, tables, KDS, customer display — big buttons, no typing, PIN login.

## 2. Roles, login and permissions

Staff log in to the back office with username + password, and to the POS terminal with a 4–6 digit PIN (fast switching between cashiers on one device). Every sensitive action is checked inside the **service method** (e.g. `OrderService.voidItem()` calls `auth.require('order.void')`), not only hidden in the UI.

| Permission | Owner | Manager | Cashier | Waiter | Barista / Kitchen |
| --- | --- | --- | --- | --- | --- |
| Create order, add items | Yes | Yes | Yes | Yes | No |
| Take payment | Yes | Yes | Yes | No | No |
| Discount ≤ 10% | Yes | Yes | Yes | No | No |
| Discount > 10%, free item | Yes | Yes | PIN approval | No | No |
| Void item after sent to kitchen | Yes | Yes | PIN approval | PIN approval | No |
| Refund / reopen paid bill | Yes | Yes | No | No | No |
| Open / close shift, cash in/out | Yes | Yes | Own shift | No | No |
| Move / merge / split table | Yes | Yes | Yes | Yes | No |
| KDS: start, bump, recall ticket | Yes | Yes | No | No | Yes |
| Products, prices, recipes | Yes | Yes | No | No | No |
| Stock in, adjust, waste | Yes | Yes | No | No | Waste only |
| Reports | All | All except profit | Own shift | No | No |
| Staff, settings, exchange rate | Yes | Rate only | No | No | No |

**Manager approval flow:** when a cashier tries a protected action, a PIN pad pops up; the manager types their PIN on the same device; `ApprovalService` checks the hashed PIN and the manager's permission, then the action runs and `approved_by` is saved in the audit log. No need to log out.

**Audit log:** every void, refund, discount, price change, drawer open without sale, rate change and login is stored with user, time, device, old value, new value and reason. Reasons are picked from a list (Customer changed mind, Wrong order, Spilled, Staff meal, Complaint).

## 3. Module specifications

Ten modules. Build them in this order: Settings → Products & modifiers → POS terminal → Payments → Shifts → Tables → KDS → Inventory → Reports → Loyalty & Telegram.

### 3.1 POS terminal (cashier screen)

- Left: category tabs (Coffee, Tea, Milk Tea, Frappe, Soft drink, Beer, Food, Bakery) + product grid with photo, Khmer + English name, price. Search bar and barcode scanner input for retail items.
- Tap a drink → modifier popup (size, hot/iced, sugar %, ice, add-ons, note). Required groups must be chosen before "Add". Add-ons change price (+$0.50 extra shot).
- Right: current order (cart) — qty +/−, swipe/long-press to edit or remove, line note, per-line discount.
- Top of cart: order type (Dine-in / Take-away / Delivery), table number, customer (phone lookup for loyalty), guest count.
- Bottom: Subtotal, Discount, Service charge (optional), VAT, **Total USD**, **Total KHR**. Buttons: Hold, Send to kitchen, Print bill, Pay.
- **Hold / park order**: save cart, serve next customer, recall later.
- Order numbering: `receipt_no` = `BC-20261022-0001` (store prefix + date + running), plus `queue_no` #001 reset daily.
- Keyboard shortcuts for desktop cashiers: F2 search, F4 pay, F8 hold, Esc clear.

### 3.2 Payments (USD / KHR / KHQR)

- Methods: Cash USD, Cash KHR, KHQR (Bakong), ABA PayWay QR, Card (manual record), Delivery platform (Grab etc., settled later), Credit / pay later (owner only).
- **Split payment**: one bill paid by several methods, e.g. $5 cash + rest by KHQR.
- Cash screen: quick buttons ($1, $5, $10, $20, 10,000 ៛, 20,000 ៛, 50,000 ៛, Exact). Input boxes for USD received and KHR received.
- Change logic:
  1. `paid_usd_equiv = usd_received + khr_received / rate`
  2. `change_usd_equiv = paid_usd_equiv - total_usd`
  3. Default: give whole dollars in USD and the remainder in KHR, rounded to 100 ៛. Example: total $3.75, customer gives $10 → change $6 + 1,000 ៛.
- Store the exchange rate **on every order** at the time of sale; reports must never recalculate old orders with today's rate.
- KHQR flow: (simulated, see 6.3) create order → MockKhqrProvider builds a demo QR with amount and bill number → show QR on POS and customer display with a 3:00 countdown → "Simulate customer paid" button (or auto after 5 s in demo mode) → mark paid, print receipt, broadcast payment.confirmed. If the countdown ends, show "Expired — generate new QR".
- Money in IndexedDB: always integer cents (USD) and integer riel (KHR) — never floating point.

### 3.3 Shifts and cash drawer

- **Open shift**: cashier counts starting float by denomination (USD: 1, 5, 10, 20, 50, 100; KHR: 100, 500, 1,000, 2,000, 5,000, 10,000, 20,000, 50,000, 100,000). No sale is allowed without an open shift.
- **Cash in / cash out** during shift with reason (buy ice, pay supplier, owner withdrawal).
- **Close shift (blind count)**: cashier counts cash without seeing the expected amount; system then shows Expected vs Counted vs Difference for USD and KHR separately.
- Close prints a **Z-report**: sales by payment method, by category, discounts, voids, refunds, cash in/out, opening float, expected cash, counted cash, difference, number of orders, average bill. Sent to Telegram automatically.
- X-report = same report mid-shift without closing.

### 3.4 Tables and floor plan

- Floor plan editor: zones (Indoor, Outdoor, Upstairs), drag tables, set seats and shape.
- Table status colours: Available (white), Occupied (blue), Bill printed / waiting payment (orange), Reserved (purple), Needs cleaning (grey). Show elapsed time and current total on each table.
- Actions: open table, add items in rounds (each round sent to kitchen separately), move table, merge tables, split bill by item or by equal parts, transfer items between tables.
- Real-time: when a waiter on a phone adds an order, the cashier screen and KDS windows update instantly (BroadcastChannel).

### 3.5 Kitchen / Bar display (KDS)

- Each product has a station: Bar or Kitchen. One order can produce two tickets.
- Ticket card: queue no, order type, table, time since sent, items with modifiers in bold (e.g. **ICED · L · Sugar 50% · Less ice**), notes in red.
- Colours by age: green < 5 min, yellow 5–10 min, red > 10 min (configurable per station).
- Actions: tap item = done, Bump ticket = all done → order shows "Ready" on the cashier screen and customer display. Recall last bumped ticket.
- Voided items appear struck-through in red so the barista stops making them.
- Fallback: if no screen, print the ticket on the station's thermal printer.

### 3.6 Products, modifiers, price lists

- Product: code, name EN, name KM, category, station, photo, type (Made-to-order / Retail / Service), base price, cost (auto from recipe), tax class, active, sort order, available on (POS / Grab / QR menu).
- Variants: size S/M/L with different price **and** different recipe.
- Modifier groups: name, min/max selections, required flag, options with price delta and optional recipe impact (extra shot = +18 g coffee).
- Price lists: Default, Grab (+25%), Happy Hour (2–5 pm, −20% on Coffee category), Staff price.
- "86" (sold out) toggle: product greys out on POS instantly; auto when an ingredient hits zero.

### 3.7 Inventory and recipes

- Ingredients: name, unit (g, ml, pcs), purchase unit and conversion (1 bag = 1,000 g), cost per unit, min stock level, supplier.
- Recipe (BOM) per product variant, e.g. Iced Latte L = 18 g espresso beans + 200 ml fresh milk + 1 cup 16 oz + 1 lid + 1 straw.
- Stock moves on every sale (deduct recipe × qty, including modifiers). Void before preparation = return stock; void after = record as waste.
- Stock documents: Purchase / Stock in (from supplier, updates cost by weighted average), Transfer (between branches), Adjustment (stock count), Waste (spilled, expired).
- Monthly stock count screen: system qty vs counted qty → variance value in $.
- Low-stock alert on dashboard + Telegram.

### 3.8 Customers and loyalty

- Customer by phone number (Cambodian format 0xx xxx xxx), name, birthday, points.
- Rule example: $1 = 1 point; 100 points = 1 free regular drink. Or stamp card: buy 9 get the 10th free.
- Promotions engine: % off category, buy X get Y, happy hour by time, combo price, coupon codes.

### 3.9 Reports and dashboard

- Dashboard: today's sales (USD + KHR), orders, average bill, sales by hour chart, top 10 items, payment mix (cash vs KHQR), open tables, low stock.
- Reports with date range + export Excel/PDF: Sales summary, by item, by category, by hour, by staff, by payment method, by order type, discounts & voids, refunds, shift history, stock movement, stock valuation, COGS and gross profit, VAT report.

### 3.10 Settings and integrations

- Shop profile: name KM/EN, logo, address, phone, VAT TIN, receipt header/footer, Wi-Fi text.
- Currency: base USD, exchange rate KHR (with history), rounding rule, show KHR on receipt yes/no.
- Tax: VAT 10% on/off, inclusive/exclusive; service charge %.
- Printers: receipt printer, bar printer, kitchen printer, label (cup sticker) printer; paper width 58/80 mm.
- Telegram bot token + chat ID; choose which events to send.
- Devices: register each POS/KDS device (name, branch, station) so you know where every order came from.
- Multi-branch ready: every table has `branch_id` from day one.

## 4. Screen designs

Front-of-house screens are designed for a 1366×768 or 1920×1080 touchscreen: buttons at least 56 px tall, no hover-only actions, Khmer font **Kantumruy Pro** or **Noto Sans Khmer** with English **Inter**. Keep your current brown/indigo brand; use one accent colour for the Pay button.

### 4.1 POS terminal

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ☕ BROWN CAFE   Shift #12 · Bopha   Rate 4,100៛   ● Online   [Tables][KDS 3][≡] │
├──────────────────────────────────────────────────┬───────────────────────────┤
│ [Search / scan barcode ...........]              │ Dine-in | Take-away | Grab │
│ Coffee | Tea | Milk Tea | Frappe | Drinks | Food │ Table T05 · 2 guests       │
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐          │ Member: 012 345 678 (120pt)│
│ │ photo │ │ photo │ │ photo │ │ photo │          ├───────────────────────────┤
│ │Latte  │ │Amer.  │ │Mocha  │ │Caramel│          │ 2× Iced Latte L     $5.50  │
│ │ឡាតេ    │ │អាមេរិក │ │ម៉ូកា    │ │       │          │    Sugar 50% · Less ice    │
│ │ $2.50 │ │ $2.00 │ │ $2.75 │ │ $3.00 │          │ 1× Croissant        $1.80  │
│ └───────┘ └───────┘ └───────┘ └───────┘          │ 1× Angkor beer      $3.50  │
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐          ├───────────────────────────┤
│ │  ...  │ │  ...  │ │ SOLD  │ │  ...  │          │ Subtotal          $10.80  │
│ └───────┘ └───────┘ │  OUT  │ └───────┘          │ Discount 10%      -$1.08  │
│                     └───────┘                    │ TOTAL      $9.72          │
│                                                  │            39,900 ៛        │
│ [Held orders (2)] [Recall] [Cash in/out]         │ [Hold][Send][Bill][ PAY ] │
└──────────────────────────────────────────────────┴───────────────────────────┘
```

### 4.2 Modifier popup

```text
┌────────────── Iced Latte  ឡាតេទឹកកក ──────────────┐
│ Size*      [ S $2.00 ] [ M $2.50 ] [ L $2.75 ]   │
│ Type*      [ Hot ] [ Iced ] [ Frappe +$0.50 ]    │
│ Sugar*     [0%] [25%] [50%] [75%] [100%]         │
│ Ice        [ Less ] [ Normal ] [ Extra ]         │
│ Add-ons    [+Shot $0.50] [+Oat milk $0.75]       │
│            [+Boba $0.50] [+Cheese foam $0.75]    │
│ Note       [ ............................ ]      │
│ Qty   [ − ]  2  [ + ]          [ Add  $5.50 ]    │
└──────────────────────────────────────────────────┘
```

### 4.3 Payment screen

```text
┌──────────────────────── PAY  Order #047 ────────────────────────┐
│ TOTAL  $9.72   =  39,900 ៛            Rate 4,100៛               │
│ ─────────────────────────────────────────────────────────────── │
│ [ Cash USD ] [ Cash KHR ] [ KHQR ] [ ABA ] [ Card ] [ Grab ]      │
│                                                                 │
│ USD received [ 10.00 ]   KHR received [ 0 ]                     │
│ Quick: [$1][$5][$10][$20][10,000៛][20,000៛][50,000៛][Exact]     │
│                                                                 │
│ CHANGE:   $0   +   1,100 ៛  →  rounded 1,100 ៛                  │
│ Split: Cash $10.00 ✓   Remaining $0.00                          │
│                                    [ Cancel ]  [ Complete ✓ ]   │
└─────────────────────────────────────────────────────────────────┘
KHQR tab: big QR in the centre, amount, 3:00 countdown, status
"Waiting for payment…" → "Paid ✓ ABA · 15:42" (auto-close + print)
```

### 4.4 Tables

```text
 Indoor | Outdoor | Upstairs                 ■ free ■ busy ■ bill ■ reserved
 ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
 │ T01  │ │ T02  │ │ T03  │ │ T04  │
 │ free │ │$12.40│ │ BILL │ │ 18:30│
 │      │ │ 35min│ │$8.10 │ │ Dara │
 └──────┘ └──────┘ └──────┘ └──────┘
 Long-press a table: Move · Merge · Split bill · Print bill · Clear
```

### 4.5 KDS (Bar station)

```text
┌ #045 Dine-in T02 ── 03:12 ┐ ┌ #046 Take-away ── 07:40 ┐ ┌ #047 Grab ── 11:05 ┐
│ 2× ICED LATTE L           │ │ 1× MATCHA LATTE M       │ │ 1× AMERICANO HOT    │
│    Sugar 50% · Less ice   │ │    Oat milk · 0% sugar  │ │ ~~1× MOCHA~~ VOID   │
│ 1× PASSION SODA           │ │ NOTE: no straw          │ │                     │
│         [ BUMP ]          │ │        [ BUMP ]         │ │      [ BUMP ]       │
└─────── green ─────────────┘ └────── yellow ──────────┘ └────── red ─────────┘
```

### 4.6 Receipt (80 mm)

```text
          [LOGO]
     BROWN CAFE & BISTRO
   ហាងកាហ្វេ ប្រោន · Phnom Penh
  Tel 012 xxx xxx · VAT TIN Kxxx-xxxxxxxxx
----------------------------------------
Receipt: BC-20261022-0047   Queue #047
Date: 22/10/2026 15:42   Cashier: Bopha
Table: T02 (Dine-in)
----------------------------------------
2 Iced Latte L               5.50
  Sugar 50%, Less ice
1 Croissant                  1.80
1 Angkor Beer                3.50
----------------------------------------
Subtotal                    10.80
Discount 10%                -1.08
VAT 10% (included)           0.88
TOTAL USD                   $9.72
TOTAL KHR                 39,900៛
Rate: 1$ = 4,100៛
Paid Cash USD              $10.00
Change                     1,100៛
----------------------------------------
   [KHQR for next visit / Facebook]
   Wi-Fi: BrownCafe  Pass: xxxxxxxx
     សូមអរគុណ! Thank you, see you!
```

Also add a **customer-facing display** (second monitor or tablet): order lines as the cashier adds them, total in $ and ៛, KHQR during payment, and promotions slideshow when idle.

## 5. Data model

39 IndexedDB tables (Dexie) in 7 groups — the same model a SQL database would use, with UUID string keys from crypto.randomUUID(). Every table also has `id`, `created_at`, `updated_at`, and (where it makes sense) `branch_id` and `deleted_at` for soft delete. Never hard-delete orders, products or users.

| Group | Table | Key columns |
| --- | --- | --- |
| Org | branches | name\_en, name\_km, address, phone, vat\_tin, receipt\_header, receipt\_footer, wifi\_text |
| Org | devices | branch\_id, name, type (POS/KDS/CDS/Waiter), station\_id, last\_seen\_at |
| Org | settings | branch\_id, key, value (json) |
| Org | exchange\_rates | branch\_id, rate\_khr, effective\_from, set\_by |
| Staff | users | name, username, password\_hash, pin\_hash, role\_id, active |
| Staff | roles / permissions / role\_permissions | code (e.g. order.void, discount.over\_limit) |
| Staff | audit\_logs | user\_id, approved\_by, device\_id, action, entity, entity\_id, old\_value, new\_value, reason |
| Menu | categories | name\_en, name\_km, sort, color, station\_id |
| Menu | stations | name (Bar, Kitchen), printer\_id |
| Menu | products | sku, barcode, name\_en, name\_km, category\_id, type (made/retail/service), image\_url, tax\_class, active, is\_sold\_out |
| Menu | product\_variants | product\_id, name (S/M/L), price, cost |
| Menu | modifier\_groups | name, min\_select, max\_select, required |
| Menu | modifier\_options | group\_id, name\_en, name\_km, price\_delta |
| Menu | product\_modifier\_groups | product\_id, group\_id, sort |
| Menu | price\_lists / price\_list\_items | name, channel, time\_from, time\_to / variant\_id, price |
| Floor | zones / tables | name / zone\_id, name, seats, pos\_x, pos\_y, shape, status |
| Sales | shifts | user\_id, device\_id, opened\_at, closed\_at, open\_float\_usd, open\_float\_khr, counted\_usd, counted\_khr, expected\_usd, expected\_khr, status |
| Sales | cash\_movements | shift\_id, type (in/out), amount, currency, reason, user\_id |
| Sales | orders | receipt\_no, queue\_no, shift\_id, table\_id, customer\_id, order\_type, channel, status, subtotal, discount\_total, service\_charge, vat\_total, grand\_total\_usd, grand\_total\_khr, exchange\_rate, guest\_count, opened\_by, closed\_by, paid\_at |
| Sales | order\_items | order\_id, variant\_id, name\_snapshot, qty, unit\_price, discount, line\_total, note, kitchen\_status, sent\_at, round\_no, void\_reason, voided\_by |
| Sales | order\_item\_modifiers | order\_item\_id, option\_id, name\_snapshot, price\_delta |
| Sales | payments | order\_id, method, amount, currency, amount\_usd\_equiv, received, change\_usd, change\_khr, reference (bank txn / md5), status |
| Sales | refunds | order\_id, amount, method, reason, approved\_by |
| Sales | discounts / promotions | type (percent/amount/bogo/happy\_hour), value, scope, start\_at, end\_at, conditions (json) |
| CRM | customers / loyalty\_transactions | phone, name, birthday, points / customer\_id, order\_id, points (+/−) |
| Stock | ingredients | name, unit, purchase\_unit, conversion, avg\_cost, min\_level |
| Stock | recipes | variant\_id or modifier\_option\_id, ingredient\_id, qty |
| Stock | stock\_levels | branch\_id, ingredient\_id (or retail variant\_id), qty\_on\_hand |
| Stock | stock\_moves | branch\_id, item\_id, qty (+/−), type (sale/purchase/waste/adjust/transfer/void\_return), ref\_type, ref\_id, unit\_cost |
| Stock | suppliers / purchase\_orders / purchase\_order\_lines | name, phone / supplier\_id, status, total / ingredient\_id, qty, unit\_cost |

Three rules that make the data trustworthy:

1. **Snapshots**: `order_items.name_snapshot`, `unit_price`, `orders.exchange_rate` are copied at sale time, so renaming a product or changing a price never changes old receipts.
2. **Stock is a ledger**: `stock_levels` is only updated together with a `stock_moves` row, inside the same Dexie transaction as the payment.
3. **Order status machine**: `draft → sent → (partially) served → bill_printed → paid` or `→ voided`; `paid → refunded` only with manager approval. OrderService rejects any other jump.

## 6. Technical architecture (frontend only)

The whole system runs in the browser: one Angular app plus an in-browser database (IndexedDB through Dexie.js) that plays the role of the backend. There is no server and no SQL, but the code is layered like a real system, so a real API could replace the data layer later without touching any screen.

&#91;embedded content: system architecture · 5 screen types, 1 API\]

Screens never touch data directly: they go through stores, then services (the business rules), then repositories, which are the only code that reads or writes IndexedDB.

| Need | Library / browser feature | Why |
| --- | --- | --- |
| Framework | Angular (latest), standalone components, Signals, new control flow | Modern Angular — what you already run on localhost:4200 |
| Styling | Tailwind CSS + design tokens (section 9) | Consistent, fast to build |
| Dialogs, overlays, drag-drop | Angular CDK | Modifier popup, payment dialog, floor-plan editor |
| Icons | lucide-angular | Clean icon set |
| Data storage | IndexedDB via Dexie.js (`liveQuery` for auto-refresh) | Real tables, indexes and transactions in the browser; survives refresh |
| Demo data | Seed files in TypeScript | First run fills menu, users, tables, ingredients |
| Real-time between screens | BroadcastChannel API | POS, KDS and customer display windows update each other instantly |
| Charts | Chart.js (ng2-charts) | Dashboard and reports |
| QR code | angularx-qrcode | KHQR display (simulated) |
| Export | SheetJS (xlsx) + `window.print()` to PDF | Excel and PDF reports |
| Printing | `window.print()` with an 80 mm receipt component | Khmer prints correctly through the browser |
| PIN security | Web Crypto SHA-256 + salt | PINs never stored in plain text |
| Install on tablet | Angular PWA (service worker) | Runs full screen, works with no internet |

### 6.1 Layers — the "fake backend"

1. **Pages and components** — UI only, no calculations.
2. **Stores (Signals)** — screen state such as the cart, current table, KDS tickets.
3. **Services** — the business rules a backend would normally have. Example: `PaymentService.pay()` checks the permission, recalculates totals, saves payments, sets the order to paid, deducts stock by recipe, adds loyalty points and writes the audit log — all inside **one Dexie transaction**, so either everything is saved or nothing is.
4. **Repositories** — the only code that touches IndexedDB. Each has API-like methods (`list`, `get`, `create`, `update`, `softDelete`). To add a real backend later, you rewrite only this layer with `HttpClient`.
5. **IndexedDB (Dexie)** — the tables from section 5.

### 6.2 Real-time between screens

- One BroadcastChannel named `brown-pos`. Services publish events after saving: `order.created`, `order.sent`, `ticket.bumped`, `table.status_changed`, `payment.confirmed`, `product.sold_out`, `cart.updated` (for the customer display).
- Lists use Dexie `liveQuery`, so they refresh automatically when data changes in another tab.
- Demo setup: open `/pos`, `/kds/bar` and `/display` in three windows of the same browser (customer display on a second monitor). They behave like separate devices.
- Limitation to state honestly in your report: data lives in one browser on one computer. Two different tablets cannot share orders without a server — that is the only thing a backend would add.

### 6.3 Payments

- **Cash USD/KHR**: fully real logic (change, rounding, split payment, drawer count).
- **KHQR**: simulated. The app builds a demo QR containing shop name, amount and bill number, shows a 3:00 countdown and "Waiting for payment…", then a **Simulate customer paid** button (or auto-confirm after 5 s in demo mode) completes the same flow a real bank confirmation would.
- Write it behind a `PaymentProvider` interface with a `MockKhqrProvider`, so a real Bakong/ABA integration can be plugged in later. Never put real bank keys in frontend code.

### 6.4 Printing Khmer receipts

- A hidden `print-host` component renders the receipt (80 mm wide, Khmer font) and calls `window.print()` with `@page { size: 80mm auto; margin: 0 }`. The browser draws Khmer correctly, which raw ESC/POS printing cannot.
- Set the thermal printer as the default printer and turn off browser headers/footers.
- For silent printing on the cashier PC, start Chrome with the `--kiosk-printing` flag.

### 6.5 Telegram (optional)

The browser can call the Telegram Bot API directly with `fetch` (`sendMessage`) to send shift reports and alerts. The bot token is then visible in the browser, so use a demo bot only.

### 6.6 Keeping data safe

- Call `navigator.storage.persist()` on first run so the browser does not clear the database.
- Settings → Backup: **Export all data** to a JSON file, **Import** from a file, **Reset demo data** (re-run the seed — your existing Reset button).
- Show a reminder on the dashboard if no backup was made in 7 days.

### 6.7 Rules that make it feel real

- Totals are always recalculated in services, never trusted from a component.
- Permission checks run inside service methods, not only by hiding buttons.
- PIN login locks for 1 minute after 5 wrong tries.
- Soft delete everywhere; orders are never deleted.
- Unit tests for money logic: change, KHR rounding, VAT, split payment, discounts.

The complete folder structure is in section 8.

## 7. Build plan with Antigravity

Give Antigravity this spec once as a project rule, then build one phase per conversation in **Planning mode**: let the agent write its implementation plan, review it, then let it code and test. Don't ask for the whole system in one prompt — it will produce shallow code.

### 7.0 Setup (do once)

1. Export this doc as Markdown and save it in your Angular project as `docs/POS_SPEC.md`.
2. Add a workspace rule in Antigravity (Customizations → Rules) with the text below.
3. Commit to Git after every phase that works, so you can roll back.

```text
PROJECT RULE — Brown Cafe POS (frontend only)
- Read docs/POS_SPEC.md before planning any task. Follow its data model, structure (section 8), design system (section 9) and code standards (section 10).
- FRONTEND ONLY: Angular (latest), standalone components, Signals, new control flow, OnPush, Tailwind, Angular CDK, lucide-angular.
- NO backend, NO server, NO HttpClient calls. All data in IndexedDB through Dexie.js, accessed ONLY by repositories in src/app/core/data/repositories.
- Business rules live in services (the "fake backend"): recalculate totals, check permissions, write payment + stock + points + audit in ONE Dexie transaction.
- Screens sync with BroadcastChannel('brown-pos') and Dexie liveQuery.
- KHQR is simulated with MockKhqrProvider behind a PaymentProvider interface.
- Money: never float. USD as integer cents, KHR as integer riel rounded to 100. Use src/app/core/money/money.ts only.
- Every order stores exchange_rate, name and price snapshots.
- UI text in English + Khmer via translate service. Khmer font: Kantumruy Pro. Touch buttons >= 56px.
- Write unit tests for money logic. Do not change files outside the current phase without asking.
```

### 7.1 Phases and prompts

| Phase | Goal | Done when |
| --- | --- | --- |
| 0 | Scaffold: structure, layouts, design system, UI kit, all routes | Every page opens and looks finished (prompt in 10.5) |
| 1 | Data layer: Dexie database, repositories, seed, auth, roles | PIN login works, demo data loads, Reset works |
| 2 | Catalog: products, variants, modifiers, price lists | Your Product page reads/writes IndexedDB |
| 3 | POS terminal + cart | Order with modifiers, hold/recall, survives refresh |
| 4 | Payments USD/KHR + receipt | Cash sale with correct change prints a Khmer receipt |
| 5 | Shifts + Z-report | Blind close shows correct difference |
| 6 | Tables + live sync | Two windows see table changes instantly |
| 7 | KDS + customer display | Barista bumps, POS shows Ready |
| 8 | Inventory + recipes + purchasing | Selling a latte reduces milk and beans |
| 9 | Mock KHQR, backup/export, optional Telegram | QR "payment" completes the flow; export/import JSON works |
| 10 | Dashboard, reports, PWA, polish | Reports match a hand calculation |

**Phase 1 prompt**

```text
Read docs/POS_SPEC.md sections 2, 5, 6 and 8. Frontend only — no backend.
In src/app/core/data create db.ts with Dexie: all tables from section 5 with indexes (e.g. orders: id, receipt_no, shift_id, status, created_at; order_items: id, order_id; stock_moves: id, item_id, created_at).
Create a generic BaseRepository<T> (list with filter/sort/paging, get, create, update, softDelete, liveList) and one repository per table group.
Create seed files: 1 branch "Brown Cafe & Bistro", roles Owner/Manager/Cashier/Waiter/Barista with permissions from section 2, users with PINs 1111..5555 (SHA-256 + salt via Web Crypto), exchange rate 4100, 8 tables in 2 zones. SeedService runs on first launch and on "Reset demo data".
AuthService: username/password and PIN login, lock 1 minute after 5 wrong tries, current user + permissions as signals, require(permission) that throws. ApprovalService opens the PIN pad and returns the approving manager.
Call navigator.storage.persist(). Show me the plan first.
```

**Phase 2 prompt**

```text
Implement section 3.6 and the Menu group of section 5 using the repositories (no HTTP).
Refactor my existing Product Info page to /admin/catalog/products: list with search, category filter, pagination, image (stored as compressed base64 data URL, max 200 KB), Khmer name, variants S/M/L, modifier group assignment, station, sold-out toggle, Export CSV, Print. Product form as a drawer with validation.
Also build categories, modifier groups and price lists pages.
Seed a realistic Cambodian cafe menu: 25 items (Iced Latte, Americano, Cappuccino, Mocha, Caramel Macchiato, Green tea latte, Matcha, Thai tea, Brown sugar milk tea, Passion soda, Coca, Sting, ABC, Angkor, Cambodia Water, Croissant, Fried rice, Lok lak...) with Khmer names, prices and modifier groups Size, Type, Sugar, Ice, Add-ons.
```

**Phase 3 prompt**

```text
Build the POS terminal (section 3.1, wireframes 4.1 and 4.2, design rules 9.3–9.5) at /pos in pos-layout.
Use CartStore from section 10.3 (Signals, totals in USD and KHR, autosave draft to IndexedDB so refresh restores the cart).
Modifier dialog enforces required groups and min/max. Hold/recall orders (status draft), order types, table, customer lookup by phone, line notes, discounts (approval over 10%).
OrderService: createOrder, holdOrder, sendToKitchen (assigns daily queue_no, sets kitchen_status, broadcasts order.sent). Totals recalculated in the service.
Keyboard shortcuts F2/F4/F8/Esc, barcode input. Show me the plan and component tree first.
```

**Phase 4 prompt**

```text
Implement payments (section 3.2, wireframe 4.3): Cash USD, Cash KHR, Card (record), Grab (record), split payment, quick note buttons.
Use money.ts from section 10.2 (tests must pass). PaymentService.pay() in ONE Dexie transaction: payments rows, order paid, paid_at, audit log, broadcast payment.confirmed.
Receipt component matching section 4.6 (80mm, Khmer font) printed via PrinterService + print-host with window.print(). Reprint from order history (audit logged). Refund needs manager approval.
```

**Phase 5 prompt**

```text
Implement shifts (section 3.3): open shift with denomination counter for USD and KHR, shift.guard blocks /pos without an open shift, cash in/out with reason, blind close, expected vs counted vs difference per currency, X-report and Z-report screen + 80mm printable version, shift history.
```

**Phase 6 prompt**

```text
Implement tables (section 3.4, wireframe 4.4) and BroadcastService (BroadcastChannel 'brown-pos', typed events from section 6.2).
Floor editor in back office (CDK drag-drop, zones, seats, shapes). Floor view with status colours, elapsed time and total. Actions: open, add round, move, merge, split bill by item and equal parts, transfer items. Changes must appear instantly in a second browser window.
```

**Phase 7 prompt**

```text
Implement KDS (section 3.5, wireframe 4.5) at /kds/:stationId and customer display at /display, both in kiosk-layout.
Tickets split by station, age colours 5/10 min, tap item done, bump, recall, voided items struck-through, new-ticket sound. Bump broadcasts ticket.bumped and POS shows Ready. Customer display follows cart.updated live, shows totals in $ and ៛, KHQR during payment, ready queue numbers and an idle slideshow.
```

**Phase 8 prompt**

```text
Implement inventory (section 3.7) and the Stock group of section 5: ingredients with unit conversion, recipes per variant and per modifier option, stock_levels + stock_moves ledger, suppliers, purchase orders and receive stock with weighted average cost, adjustments, waste, stock count with variance.
PaymentService deducts recipe x qty in the same Dexie transaction. Auto sold-out when an ingredient reaches 0. Seed recipes for the latte family. Low-stock list on dashboard.
```

**Phase 9 prompt**

```text
Add MockKhqrProvider behind a PaymentProvider interface (section 6.3): QR with shop name, amount, bill number (angularx-qrcode), 3:00 countdown, "Simulate customer paid" button and demo auto-confirm setting, expired state.
Add BackupService (section 6.6): export all Dexie tables to JSON, import with validation and confirmation, reset demo data, 7-day backup reminder.
Optional: TelegramService using fetch to the Bot API sendMessage for Z-report and void alerts, configured in settings (demo bot only).
```

**Phase 10 prompt**

```text
Build the dashboard and reports in section 3.9 with date filters, Chart.js charts and Excel export (SheetJS) + print to PDF. Add the Angular PWA service worker and manifest. Then review the whole app against docs/POS_SPEC.md and design rules in section 9, fix inconsistencies, and list anything missing.
```

### 7.2 Tips for working with the agent

- After each phase, ask: "Write a walkthrough of what you built and run the unit tests." Then test it yourself in the browser.
- When something is wrong, paste the exact error and the file name; ask for a fix, not a rewrite.
- Ask the agent to use its browser to click through the POS flow (add latte → pay $10 cash → check change and receipt).
- If data gets messy while testing, use Settings → Reset demo data.
- Keep `docs/POS_SPEC.md` updated when you change a decision, so the next phase follows it.

### 7.3 Demo script for your presentation

1. Open three windows: `/pos`, `/kds/bar`, `/display` (on a second screen if you have one).
2. Cashier logs in with PIN 3333, opens shift with $20 + 40,000៛ float.
3. Dine-in table T02: 2 Iced Latte L (50% sugar, less ice) + Croissant → Send. The bar KDS window shows the ticket instantly.
4. Barista bumps → POS shows Ready. Customer pays $10 cash → change shown in $ + ៛ → Khmer receipt prints.
5. Take-away order paid by KHQR → QR on the customer display → Simulate paid → done.
6. Cashier tries to void an item → manager PIN popup → audit log entry.
7. Inventory shows milk and beans reduced. Close shift → Z-report. Export backup JSON.

## 8. Complete project structure

One Angular CLI project, no server. It uses standalone components, Signals, the new control flow (`@if`, `@for`) and lazy-loaded feature routes — modern Angular, not AngularJS 1.x (your `localhost:4200` is already Angular CLI).

Every feature follows the same pattern: `pages/` (routed screens), `components/` (pieces of a page), `data/` (store + service with business rules), `*.routes.ts`. Only `core/data/repositories/` touches IndexedDB.

### 8.1 Root

```text
brown-cafe-pos/
├─ src/                     the app (8.2)
├─ public/                  static files copied as-is
│  ├─ i18n/ en.json  km.json
│  ├─ sounds/ add.mp3  new-ticket.mp3  paid.mp3  error.mp3
│  ├─ images/ logo.svg  placeholder-product.png  empty-*.svg
│  ├─ products/             seed product photos (latte.jpg, coca.png ...)
│  └─ icons/                PWA icons 192/512
├─ docs/
│  ├─ POS_SPEC.md           this document
│  └─ screenshots/
├─ angular.json
├─ package.json             scripts: start, build, test, lint
├─ tailwind.config.js       colours mapped to tokens (9.1)
├─ tsconfig.json            path aliases @core/*, @shared/*, @features/*
├─ ngsw-config.json         PWA caching
├─ eslint.config.js  .prettierrc  .editorconfig
└─ README.md                how to run, demo accounts + PINs, demo script
```

### 8.2 Angular app — `src/`

```text
src/
├─ main.ts                         bootstrapApplication(AppComponent, appConfig)
├─ index.html                      fonts: Inter + Kantumruy Pro
├─ styles.css                      Tailwind layers + tokens.css + print.css
├─ styles/
│  ├─ tokens.css                   design tokens, light + dark (9.1)
│  └─ print.css                    @page 80mm, hide everything except print-host
├─ manifest.webmanifest
└─ app/
   ├─ app.component.ts             <router-outlet/> + toast host + print-host
   ├─ app.config.ts                router, service worker, APP_INITIALIZER (open DB, seed, load settings)
   ├─ app.routes.ts                top-level lazy routes (8.3)
   │
   ├─ core/                        singletons, loaded once
   │  ├─ data/                     ← the "fake backend" storage
   │  │  ├─ db.ts                  Dexie class: all tables + indexes (section 5), version migrations
   │  │  ├─ id.ts                  uuid(), nextReceiptNo(), nextQueueNo() (resets daily)
   │  │  ├─ repositories/
   │  │  │  ├─ base.repository.ts  list/get/create/update/softDelete/liveList, sets created_at, updated_at
   │  │  │  ├─ product.repository.ts  category.repository.ts  modifier.repository.ts  price-list.repository.ts
   │  │  │  ├─ order.repository.ts  payment.repository.ts  shift.repository.ts  cart-draft.repository.ts
   │  │  │  ├─ table.repository.ts  zone.repository.ts
   │  │  │  ├─ ingredient.repository.ts  recipe.repository.ts  stock.repository.ts  purchase.repository.ts
   │  │  │  ├─ customer.repository.ts  promotion.repository.ts
   │  │  │  ├─ user.repository.ts  role.repository.ts  audit.repository.ts
   │  │  │  └─ settings.repository.ts  device.repository.ts
   │  │  ├─ seed/
   │  │  │  ├─ settings.seed.ts  users.seed.ts  roles.seed.ts
   │  │  │  ├─ menu.seed.ts  modifiers.seed.ts  tables.seed.ts
   │  │  │  ├─ ingredients.seed.ts  recipes.seed.ts  suppliers.seed.ts
   │  │  │  └─ demo-orders.seed.ts  (30 days of sample sales so reports look alive)
   │  │  ├─ seed.service.ts        first run + Reset demo data
   │  │  └─ backup.service.ts      export / import JSON, backup reminder
   │  ├─ money/
   │  │  ├─ money.ts               roundKhr, usdToKhr, vatFromInclusive, calcChange (10.2)
   │  │  └─ money.spec.ts
   │  ├─ auth/
   │  │  ├─ auth.service.ts        login, pinLogin, logout, require(permission)
   │  │  ├─ auth.store.ts          currentUser, permissions (signals)
   │  │  ├─ crypto.ts              hashPin(pin, salt) with Web Crypto SHA-256
   │  │  ├─ approval.service.ts    manager PIN pad → returns approving user
   │  │  ├─ auth.guard.ts  permission.guard.ts  shift.guard.ts  device.guard.ts
   │  ├─ realtime/
   │  │  ├─ broadcast.service.ts   BroadcastChannel('brown-pos'), publish/on<T>()
   │  │  └─ events.ts              typed event names + payloads
   │  ├─ payments/
   │  │  ├─ payment-provider.ts    interface: createQr, watchStatus, cancel
   │  │  └─ mock-khqr.provider.ts  demo QR, countdown, simulate paid
   │  ├─ printing/
   │  │  ├─ printer.service.ts     printReceipt, printTicket, printReport
   │  │  └─ print-host.component.ts renders the template, then window.print()
   │  ├─ notify/
   │  │  └─ telegram.service.ts    optional, fetch sendMessage
   │  ├─ settings/
   │  │  └─ settings.store.ts      shop info, exchange rate, VAT, service charge, receipt text
   │  ├─ i18n/
   │  │  └─ translate.service.ts   lang signal 'en' | 'km', t('key'), saved per user
   │  └─ ui/
   │     ├─ toast.service.ts  dialog.service.ts (CDK Dialog)  sound.service.ts
   │     ├─ hotkeys.service.ts     F2 F4 F8 Esc
   │     └─ theme.service.ts       light / dark
   │
   ├─ shared/                      reusable, no business logic
   │  ├─ ui/
   │  │  ├─ button/                variants: primary, secondary, ghost, danger, pay; sizes sm md lg xl(touch)
   │  │  ├─ icon-button/  badge/  card/  stat-card/
   │  │  ├─ modal/  drawer/  bottom-sheet/  confirm-dialog/
   │  │  ├─ pin-pad/               4–6 dots, shake on wrong PIN
   │  │  ├─ numpad/                money keypad with 00 and backspace
   │  │  ├─ money-input/           USD or KHR, formats while typing
   │  │  ├─ denomination-counter/  rows of notes × count = total
   │  │  ├─ data-table/            sort, paginate, sticky header, row actions, empty + loading states
   │  │  ├─ search-input/  select/  segmented-control/  toggle/  checkbox/
   │  │  ├─ date-range-picker/     Today, Yesterday, This week, This month, Custom
   │  │  ├─ image-upload/          crop square, compress to ≤ 200 KB data URL
   │  │  ├─ tabs/  page-header/  breadcrumb/
   │  │  ├─ empty-state/  skeleton/  spinner/
   │  │  ├─ qr-code/               wraps angularx-qrcode
   │  │  └─ chart/                 wraps Chart.js (line, bar, doughnut)
   │  ├─ pipes/
   │  │  ├─ usd.pipe.ts            123450 cents → $1,234.50
   │  │  ├─ khr.pipe.ts            39900 → 39,900 ៛
   │  │  ├─ dual-money.pipe.ts     $9.72 · 39,900 ៛
   │  │  ├─ khmer-digits.pipe.ts   123 → ១២៣ (optional)
   │  │  ├─ time-ago.pipe.ts       "5 min"
   │  │  └─ localized-name.pipe.ts picks name_km or name_en by language
   │  ├─ directives/
   │  │  ├─ has-permission.directive.ts   *hasPermission="'order.void'"
   │  │  ├─ long-press.directive.ts  autofocus.directive.ts  barcode-listener.directive.ts
   │  └─ models/                   interfaces matching section 5
   │     product.model.ts  order.model.ts  payment.model.ts  shift.model.ts  table.model.ts
   │     ticket.model.ts  inventory.model.ts  customer.model.ts  user.model.ts  report.model.ts  settings.model.ts
   │
   ├─ layouts/
   │  ├─ backoffice-layout/        sidebar + topbar + content, collapsible, mobile drawer
   │  ├─ pos-layout/               full screen, slim top bar, no sidebar
   │  └─ kiosk-layout/             KDS + customer display, no chrome, dark theme
   │
   └─ features/
      ├─ auth/
      │  ├─ pages/ login/  pin-login/  device-setup/ (name this window: POS 1, KDS Bar, Display)
      │  └─ auth.routes.ts
      ├─ shift/
      │  ├─ pages/ open-shift/  close-shift/  shift-report/ (X/Z)  shift-history/
      │  ├─ components/ cash-movement-dialog/  variance-summary/
      │  ├─ data/ shift.service.ts  shift.store.ts
      │  └─ shift.routes.ts
      ├─ pos/
      │  ├─ pages/ terminal/  order-history/ (reprint, refund)
      │  ├─ components/
      │  │  ├─ pos-topbar/          shift, cashier, rate, KDS badge, clock
      │  │  ├─ category-tabs/  product-grid/  product-card/
      │  │  ├─ cart-panel/  cart-line/  cart-totals/
      │  │  ├─ order-type-switch/  customer-lookup/
      │  │  ├─ modifier-dialog/  discount-dialog/  void-dialog/
      │  │  ├─ held-orders-drawer/
      │  │  ├─ payment-dialog/
      │  │  │  ├─ cash-tab/         USD + KHR inputs, quick notes, change
      │  │  │  ├─ khqr-tab/         QR, countdown, simulate paid
      │  │  │  ├─ other-tab/        card, Grab, credit
      │  │  │  └─ split-summary/
      │  │  └─ receipt-template/    80 mm layout from section 4.6
      │  ├─ data/
      │  │  ├─ cart.store.ts        lines, totals (10.3)
      │  │  ├─ pos.store.ts         menu, categories, held orders, current order
      │  │  ├─ order.service.ts     create, hold, send, void, refund, status machine
      │  │  └─ payment.service.ts   pay() in one Dexie transaction
      │  └─ pos.routes.ts
      ├─ tables/
      │  ├─ pages/ floor-view/  floor-editor/
      │  ├─ components/ table-card/  zone-tabs/  table-actions-sheet/  move-table-dialog/  merge-tables-dialog/  split-bill-dialog/
      │  ├─ data/ table.service.ts  tables.store.ts
      │  └─ tables.routes.ts
      ├─ kds/
      │  ├─ pages/ kds-board/  (route /kds/:stationId)
      │  ├─ components/ ticket-card/  ticket-item/  kds-header/
      │  ├─ data/ kds.service.ts  kds.store.ts
      │  └─ kds.routes.ts
      ├─ customer-display/
      │  ├─ pages/ display/         cart / KHQR / ready numbers / idle slideshow
      │  └─ customer-display.routes.ts
      ├─ dashboard/
      │  ├─ pages/ dashboard/
      │  └─ components/ kpi-row/  sales-by-hour-chart/  top-items/  payment-mix/  low-stock-list/  live-tables/  backup-reminder/
      ├─ catalog/
      │  ├─ pages/ product-list/  category-list/  modifier-group-list/  price-list-list/
      │  ├─ components/ product-form-drawer/  variant-editor/  modifier-assign/  recipe-editor/  product-filters/
      │  ├─ data/ catalog.service.ts
      │  └─ catalog.routes.ts
      ├─ inventory/
      │  ├─ pages/ ingredient-list/  stock-levels/  stock-in/  adjustment/  waste/  stock-count/  stock-moves/
      │  ├─ components/ ingredient-form-drawer/  unit-converter/  low-stock-badge/
      │  ├─ data/ stock.service.ts
      │  └─ inventory.routes.ts
      ├─ purchasing/
      │  ├─ pages/ supplier-list/  purchase-order-list/  purchase-order-form/  receive-po/
      │  ├─ data/ purchase.service.ts
      │  └─ purchasing.routes.ts
      ├─ customers/
      │  ├─ pages/ customer-list/  customer-detail/ (history, points)
      │  ├─ data/ loyalty.service.ts
      │  └─ customers.routes.ts
      ├─ promotions/
      │  ├─ pages/ promotion-list/  promotion-form/
      │  ├─ data/ promotion.service.ts   applies best promotion to a cart
      │  └─ promotions.routes.ts
      ├─ staff/
      │  ├─ pages/ user-list/  user-form/  role-matrix/ (permissions checkbox grid)
      │  └─ staff.routes.ts
      ├─ reports/
      │  ├─ pages/ sales-summary/  sales-by-item/  sales-by-category/  sales-by-hour/  sales-by-staff/
      │  │  payment-methods/  discounts-voids/  refunds/  shift-history/  stock-valuation/  profit/  vat/
      │  ├─ components/ report-shell/ (filters, export Excel, print)
      │  ├─ data/ report.service.ts   aggregates orders from IndexedDB
      │  └─ reports.routes.ts
      ├─ audit/
      │  └─ pages/ audit-log/
      └─ settings/
         ├─ pages/ shop-profile/  currency/  tax-service/  receipt-designer/ (live 80 mm preview)
         │  telegram/  devices/  stations/  zones/  backup/ (export, import, reset)
         └─ settings.routes.ts
```

### 8.3 Routes

| URL | Layout | Guard | Who uses it |
| --- | --- | --- | --- |
| `/login`, `/pin` | none | — | Everyone |
| `/device-setup` | none | Owner | First run in a window |
| `/shift/open`, `/shift/close` | pos | auth | Cashier |
| `/pos` | pos | auth + shift | Cashier |
| `/pos/history` | pos | auth | Cashier, manager |
| `/tables` | pos | auth | Cashier, waiter |
| `/kds/:stationId` | kiosk | device | Barista, kitchen |
| `/display` | kiosk | device | Customer screen |
| `/admin/dashboard` | backoffice | report.view | Owner, manager |
| `/admin/catalog/...` | backoffice | catalog.manage | Manager |
| `/admin/inventory/...`, `/admin/purchasing/...` | backoffice | inventory.manage | Manager |
| `/admin/customers`, `/admin/promotions` | backoffice | crm.manage | Manager |
| `/admin/staff` | backoffice | staff.manage | Owner |
| `/admin/reports/...` | backoffice | report.view | Owner, manager |
| `/admin/audit` | backoffice | audit.view | Owner |
| `/admin/settings/...` | backoffice | settings.manage | Owner |
| `/dev/ui` | backoffice | dev only | You: shows every UI component |

Your current Product Info page moves to `/admin/catalog/products`; the top nav you built (Product Info, POS Terminal, Tables, Kitchen KDS, Sales & Reports) becomes the back-office sidebar plus an "Open POS" button.

### 8.4 Packages to install

```text
npm i dexie angularx-qrcode chart.js ng2-charts lucide-angular xlsx @angular/cdk
npm i -D tailwindcss postcss autoprefixer
ng add @angular/pwa
```

## 9. UI design system

One set of design tokens drives every screen, so the POS, KDS and back office look like one product. It keeps your current look (brown brand + indigo action colour) and makes it consistent.

### 9.1 Colour tokens

| Token | Light | Dark (KDS) | Use |
| --- | --- | --- | --- |
| `--brand` | #7A4A2A coffee brown | #C08457 | Logo, brand accents, selected category |
| `--primary` | #4F46E5 indigo | #818CF8 | Main actions: Add, Save, table header |
| `--pay` | #16A34A green | #22C55E | PAY / Complete button, paid status, Edit button |
| `--danger` | #DC2626 red | #F87171 | Delete, void, overdue tickets |
| `--warning` | #D97706 amber | #FBBF24 | Bill printed, 5–10 min tickets, low stock |
| `--info` | #0284C7 sky | #38BDF8 | Occupied tables, info badges |
| `--bg` | #F6F7FB | #0B0F17 | Page background |
| `--surface` | #FFFFFF | #151B26 | Cards, panels, modals |
| `--border` | #E5E7EB | #263041 | Dividers, inputs |
| `--text` | #111827 | #F3F4F6 | Main text |
| `--text-muted` | #6B7280 | #9CA3AF | Labels, Khmer subtitle, descriptions |

Category chip colours (like your Soft drink / Beer / Water / Coffee badges) come from the category's `color` field: background at 12% opacity, text at full colour.

```css
/* styles/tokens.css */
:root {
  --brand:#7A4A2A; --primary:#4F46E5; --primary-hover:#4338CA;
  --pay:#16A34A; --danger:#DC2626; --warning:#D97706; --info:#0284C7;
  --bg:#F6F7FB; --surface:#FFFFFF; --border:#E5E7EB;
  --text:#111827; --text-muted:#6B7280;
  --radius-sm:8px; --radius:12px; --radius-lg:16px;
  --shadow-sm:0 1px 2px rgb(0 0 0 / .05);
  --shadow:0 4px 16px rgb(17 24 39 / .08);
  --font-en:'Inter', system-ui, sans-serif;
  --font-km:'Kantumruy Pro', 'Noto Sans Khmer', sans-serif;
  --touch:56px;
}
[data-theme='dark'] {
  --bg:#0B0F17; --surface:#151B26; --border:#263041;
  --text:#F3F4F6; --text-muted:#9CA3AF; --primary:#818CF8;
}
body { font-family: var(--font-en), var(--font-km); background: var(--bg); color: var(--text); }
:lang(km) { font-family: var(--font-km); line-height: 1.7; }
.money { font-variant-numeric: tabular-nums; }
```

Map these in `tailwind.config.js` (`colors: { brand: 'var(--brand)', primary: 'var(--primary)', ... }`) so you write `bg-primary text-white` everywhere and never hard-code hex.

### 9.2 Typography and spacing

| Style | Size / weight | Use |
| --- | --- | --- |
| Display | 32 / 700 | Total on payment screen, KDS queue number |
| H1 | 24 / 700 | Page title ("Products") |
| H2 | 18 / 600 | Card and dialog titles |
| Body | 14 / 400 | Tables, forms |
| Touch label | 16 / 600 | POS buttons, product card name |
| Caption | 12 / 500 | Khmer subtitle, badges, timestamps |
| Money | tabular numbers, right-aligned | All prices and totals |

- Spacing scale: 4, 8, 12, 16, 24, 32, 48 px. Card padding 16 (POS) / 24 (back office).
- Radius: inputs/buttons 8, cards 12, modals 16.
- Khmer text needs line-height 1.6–1.8 or vowels get cut; never put Khmer in fixed-height boxes.
- Icons: Lucide (`lucide-angular`), 20 px in back office, 24 px on POS, always with a text label on touch screens.

### 9.3 Core components

| Component | Rules |
| --- | --- |
| Button | Variants primary / secondary / ghost / danger / pay. Heights 36 (back office), 56 (POS), 72 (Pay). Disabled = 40% opacity, loading = spinner + keeps width. |
| Product card | Square photo, name EN (16/600), name KM (12 muted), price bottom-right. Tap = add (or open modifiers). Sold out = grey + "SOLD OUT" ribbon, not clickable. Min 140×160 px. |
| Cart line | Qty badge, name, modifiers on second line in muted text, price right. Tap = edit, swipe left = remove (needs approval if sent). |
| Modal / dialog | Title + close, content, sticky footer with actions right (primary last). Esc and backdrop close only for non-destructive dialogs. |
| PIN pad | 3×4 keys 72 px, dots row, shake + red on wrong PIN, no PIN shown in plain text. |
| Data table | Sticky header in `--primary` (as you have), zebra off, row hover, row height 64 with image, actions column right, pagination 20/50/100, empty state with illustration + "Add first product" button. |
| Badge | Pill, 12/500, tinted background. Status set: Paid, Unpaid, Void, Refunded, Draft, Sent, Ready. |
| Toast | Top-right (back office), top-centre (POS). Success 3 s, error stays until closed. Bilingual message. |
| Stat card | Icon in tinted square, label caption uppercase, value H1, optional trend ▲ 12% vs yesterday. |

### 9.4 Screen layout rules

- **POS terminal**: 2 columns, product area 65% / cart 35% (min 360 px). Cart is always visible; totals and Pay button stick to the bottom. On a tablet in portrait the cart becomes a bottom sheet.
- **Back office**: sidebar 248 px (collapsible to 72 px icons), topbar 64 px with branch switch, language EN/ខ្មែរ, user menu. Content max width 1440 px.
- **KDS**: dark theme by default, auto-fit ticket grid (min 280 px columns), header with counts per status and a clock, no scrolling inside tickets.
- **Customer display**: large type, brand background, totals in both currencies, QR 320 px.
- Breakpoints: 640 (phone/waiter), 1024 (tablet POS), 1280 (desktop), 1920 (wide).

### 9.5 Interaction rules (what makes it feel professional)

1. Every tap responds within 100 ms: item appears in cart immediately (optimistic), sound + short highlight on the new line.
2. Loading = skeletons, not spinners on blank pages.
3. Destructive actions always confirm, and say what will happen ("Void 1 × Iced Latte? Stock will be returned").
4. Never lose an order: cart autosaves to IndexedDB on every change; a page refresh restores it.
5. Errors say what to do next, in Khmer and English ("Printer offline — check cable or print later from History").
6. Numbers: USD always 2 decimals, KHR no decimals with thousand separators and ៛.
7. Keyboard: Enter confirms dialogs, Esc closes, F-keys on POS, barcode scanner works anywhere on the POS.
8. Language switch EN/ខ្មែរ updates instantly without reload; product names follow the language, prices don't change.
9. Accessibility: contrast ≥ 4.5:1, focus ring visible (2 px `--primary`), all icon buttons have aria-labels.

## 10. Code standards and starter code

Run **Phase 0** below before Phase 1 in section 7: it builds the whole skeleton (structure, layouts, design tokens, UI kit, all routes as placeholders), so every later phase only fills in features and the app looks finished from day one.

### 10.1 Conventions

- File names kebab-case: `product-card.component.ts`; one component per folder with `.ts`, `.html`, `.css`, `.spec.ts`.
- Components: standalone, `ChangeDetectionStrategy.OnPush`, `input()` / `output()` signal APIs, `inject()` instead of constructor injection.
- State: Signals in `*.store.ts` (`signal`, `computed`, `effect`); components read stores and call services, never Dexie directly.
- Data: only repositories in `core/data/repositories/` read and write tables; services that need a multi-table transaction open it with `db.transaction()` and call repositories inside it.
- No business math in components — money logic lives only in `core/money/money.ts` and is unit tested.
- All UI text through `t('key')` with `en.json` + `km.json`; no hard-coded strings.
- Errors: services throw `PosError('payment.not_enough')`; a global handler shows the translated toast.
- Lint + format on save (ESLint + Prettier); Git commit messages `feat(pos): split payment`, `fix(kds): bump sound`.

### 10.2 Money utilities — `src/app/core/money/money.ts`

```ts
// All USD amounts are integer cents. All KHR amounts are integer riel.
export const KHR_STEP = 100; // smallest note in circulation

export function roundKhr(riel: number, step = KHR_STEP): number {
  return Math.round(riel / step) * step;
}

export function usdToKhr(cents: number, rate: number): number {
  return roundKhr((cents * rate) / 100);
}

/** VAT contained in a VAT-inclusive total. */
export function vatFromInclusive(totalCents: number, vatPct: number): number {
  return Math.round(totalCents - totalCents / (1 + vatPct / 100));
}

export interface ChangeResult {
  shortCents: number;   // > 0 means customer has not paid enough
  changeUsd: number;    // whole dollars to give back
  changeKhr: number;    // riel to give back, rounded to 100
}

/** Customer may pay USD + KHR together. Change = whole dollars in USD, remainder in KHR. */
export function calcChange(totalCents: number, paidUsdCents: number, paidKhr: number, rate: number): ChangeResult {
  const paidCents = paidUsdCents + Math.round((paidKhr * 100) / rate);
  const diff = paidCents - totalCents;
  if (diff < 0) return { shortCents: -diff, changeUsd: 0, changeKhr: 0 };
  const changeUsd = Math.floor(diff / 100);
  const changeKhr = roundKhr(((diff % 100) * rate) / 100);
  return { shortCents: 0, changeUsd, changeKhr };
}
```

```ts
// money.spec.ts
it('total $3.75, paid $10 → $6 + 1,000៛', () => {
  expect(calcChange(375, 1000, 0, 4100)).toEqual({ shortCents: 0, changeUsd: 6, changeKhr: 1000 });
});
it('total $9.72 = 39,900៛', () => expect(usdToKhr(972, 4100)).toBe(39900));
it('paid $5 + 20,000៛ for $9.72', () => {
  expect(calcChange(972, 500, 20000, 4100).changeUsd).toBe(0);
});
```

### 10.3 Cart store — `features/pos/data/cart.store.ts`

```ts
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SettingsStore } from '../../../core/settings/settings.store';
import { CartDraftRepository } from '../../../core/data/repositories/cart-draft.repository';
import { usdToKhr, vatFromInclusive } from '../../../core/money/money';
import { CartLine, OrderType, SelectedModifier } from '../../../shared/models/order.model';
import { Product, Variant } from '../../../shared/models/product.model';

const lineTotal = (l: CartLine) =>
  (l.unitCents + l.modifiers.reduce((s, m) => s + m.priceDeltaCents, 0)) * l.qty - l.discountCents;

@Injectable({ providedIn: 'root' })
export class CartStore {
  private settings = inject(SettingsStore);
  private drafts = inject(CartDraftRepository);

  readonly lines = signal<CartLine[]>([]);
  readonly orderType = signal<OrderType>('DINE_IN');
  readonly tableId = signal<string | null>(null);
  readonly customerId = signal<string | null>(null);
  readonly orderDiscountPct = signal(0);

  readonly itemCount = computed(() => this.lines().reduce((s, l) => s + l.qty, 0));
  readonly subtotalCents = computed(() => this.lines().reduce((s, l) => s + lineTotal(l), 0));
  readonly discountCents = computed(() => Math.round(this.subtotalCents() * this.orderDiscountPct() / 100));
  readonly totalCents = computed(() => this.subtotalCents() - this.discountCents()); // VAT-inclusive prices
  readonly vatCents = computed(() => vatFromInclusive(this.totalCents(), this.settings.vatPct()));
  readonly totalKhr = computed(() => usdToKhr(this.totalCents(), this.settings.exchangeRate()));
  readonly isEmpty = computed(() => this.lines().length === 0);

  constructor() {
    // never lose an order: autosave every change
    effect(() => this.drafts.save({ lines: this.lines(), orderType: this.orderType(), tableId: this.tableId() }));
  }

  add(product: Product, variant: Variant, modifiers: SelectedModifier[] = [], qty = 1, note = '') {
    const key = `${variant.id}|${modifiers.map(m => m.optionId).sort().join(',')}|${note}`;
    this.lines.update(lines => {
      const existing = lines.find(l => l.key === key && !l.sentAt);
      if (existing) return lines.map(l => (l === existing ? { ...l, qty: l.qty + qty } : l));
      return [...lines, {
        key, productId: product.id, variantId: variant.id,
        nameEn: `${product.nameEn} ${variant.name}`, nameKm: product.nameKm,
        unitCents: variant.priceCents, modifiers, qty, note, discountCents: 0, sentAt: null,
      }];
    });
  }

  setQty(key: string, qty: number) {
    this.lines.update(ls => (qty <= 0 ? ls.filter(l => l.key !== key) : ls.map(l => (l.key === key ? { ...l, qty } : l))));
  }

  clear() {
    this.lines.set([]); this.tableId.set(null); this.customerId.set(null); this.orderDiscountPct.set(0);
  }
}
```

Lines already sent to the kitchen (`sentAt` set) can't be removed with `setQty` from the UI — the void dialog calls the API with a reason and manager approval instead.

### 10.4 Repository and service pattern

```ts
// core/data/repositories/base.repository.ts
import { inject } from '@angular/core';
import { liveQuery, Table } from 'dexie';
import { PosDb } from '../db';

export interface Entity { id: string; created_at: string; updated_at: string; deleted_at?: string | null; }

export abstract class BaseRepository<T extends Entity> {
  protected db = inject(PosDb);
  protected abstract get table(): Table<T, string>;

  list(filter?: (row: T) => boolean): Promise<T[]> {
    return this.table.filter(r => !r.deleted_at && (!filter || filter(r))).toArray();
  }
  live(filter?: (row: T) => boolean) {
    return liveQuery(() => this.list(filter)); // re-emits when any tab changes the table
  }
  get(id: string) { return this.table.get(id); }

  async create(data: Omit<T, keyof Entity>): Promise<T> {
    const now = new Date().toISOString();
    const row = { ...data, id: crypto.randomUUID(), created_at: now, updated_at: now } as T;
    await this.table.add(row);
    return row;
  }
  update(id: string, changes: Partial<T>) {
    return this.table.update(id, { ...changes, updated_at: new Date().toISOString() } as never);
  }
  softDelete(id: string) {
    return this.update(id, { deleted_at: new Date().toISOString() } as Partial<T>);
  }
}

// core/data/repositories/product.repository.ts
@Injectable({ providedIn: 'root' })
export class ProductRepository extends BaseRepository<Product> {
  protected get table() { return this.db.products; }
  byCategory(categoryId: string) { return this.list(p => p.category_id === categoryId && p.active); }
}
```

```ts
// features/pos/data/payment.service.ts — the "backend" logic
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private db = inject(PosDb);
  private auth = inject(AuthService);
  private orders = inject(OrderService);
  private payments = inject(PaymentRepository);
  private stock = inject(StockService);
  private loyalty = inject(LoyaltyService);
  private audit = inject(AuditService);
  private bus = inject(BroadcastService);

  async pay(orderId: string, inputs: PaymentInput[]): Promise<void> {
    this.auth.require('order.pay');
    const d = this.db;
    await d.transaction('rw', [d.orders, d.order_items, d.payments, d.stock_levels, d.stock_moves,
                               d.customers, d.loyalty_transactions, d.audit_logs], async () => {
      const order = await this.orders.recalculate(orderId);          // never trust UI totals
      if (order.status === 'PAID') throw new PosError('order.already_paid');
      const paid = inputs.reduce((s, p) => s + p.amountUsdCents, 0);
      if (paid < order.grand_total_usd) throw new PosError('payment.not_enough');
      for (const p of inputs) await this.payments.create({ ...p, order_id: orderId });
      await this.orders.setStatus(orderId, 'PAID');                   // validates the status machine
      await this.stock.deductForOrder(orderId);                       // recipe × qty → stock_moves
      await this.loyalty.earn(order);
      await this.audit.log('order.paid', 'order', orderId);
    });
    // only after the transaction committed:
    this.bus.publish('payment.confirmed', { orderId });
  }
}
```

Inside a Dexie transaction, only await Dexie calls — no `fetch`, timers or printing; do those after it commits.

### 10.5 Phase 0 prompt — scaffold everything

```text
Read docs/POS_SPEC.md sections 6, 8, 9 and 10 carefully. FRONTEND ONLY — no backend, no server, no HttpClient.
Create (or restructure my existing project into) the Angular app exactly as in section 8.1–8.2 and install the packages in 8.4.
Angular: latest version, standalone components, Signals, new control flow, OnPush, path aliases @core @shared @features, Tailwind mapped to the tokens in 9.1, fonts Inter + Kantumruy Pro, lucide-angular icons, Angular CDK.
Build now (fully working, styled, responsive):
1. tokens.css, print.css and tailwind.config.js from sections 9.1–9.2, light + dark theme.
2. The three layouts (backoffice, pos, kiosk) with sidebar/topbar as in 9.4, language switch EN/ខ្មែរ, user menu.
3. The whole shared/ui kit from 8.2 following the rules in 9.3, plus pipes and directives. A /dev/ui page shows every component and state.
4. All routes from 8.3 with lazy loading; each page = page-header + empty-state placeholder so navigation works end to end.
5. core/ services as typed stubs (auth, broadcast, printer, settings, translate, toast, dialog, sound, hotkeys, theme) and core/data/db.ts with the Dexie schema from section 5 (empty repositories are fine).
6. core/money/money.ts and its tests from 10.2 (tests must pass).
Do not build business features yet. Show me the plan first, then a walkthrough with screenshots of /dev/ui, /pos and /admin/dashboard.
```
