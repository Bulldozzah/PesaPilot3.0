# Customer / Sales / Inventory Reports

Added to **Account Reports** (`src/routes/_app/accounting/reports.tsx`) on 2026-06-13,
implementing the reports from "Customer Tracking Reports.docx" that the existing
double-entry data can support.

## Implemented (built from existing journal + contacts data)

**Customer Reports**
- **Sales by Customer** — revenue attributed to each customer over the period, ranked, with a chart.
- **Customer Statement** — per-customer (selector in toolbar): opening balance, invoices, payments,
  running balance, and amount due. Print-ready to send to the customer.
- **Customer Ledger** — per-customer full receivable transaction history with a running balance.
- **Customer Credit / Outstanding** — every customer's current outstanding receivable balance.

**Sales Reports**
- **Sales Register (Daily)** — every revenue-recognising entry in the period, by date, with customer.
- **Monthly Sales Summary** — operating revenue per month, with total / average / best-month and a trend chart.

**Inventory**
- **Inventory Valuation & Turnover** — accounting value of inventory asset accounts from the general
  ledger, plus inventory turnover (COGS ÷ average inventory).

### How customer attribution works
Reports use the `customer_id` already present on `journal_lines`. A sale is attributed to a customer
when any line in the entry carries that customer id (typically the A/R line). Statements/ledgers use the
Accounts Receivable control account. **If your entries don't tag a customer, those reports show
"Unattributed"** — start selecting a customer on the relevant line when posting sales.

## NOT implemented — these need a new data model (flagged in-app)

These reports require tables and data-entry screens that don't exist yet, so they were **not** faked:

| Report | Needs |
|---|---|
| Sales by Product / Service | a `products` table + a product id on sale lines |
| Sales by Salesperson | a salesperson field + assignment on sales |
| Sales Pipeline | a CRM/`deals` table (prospect → quoted → won) |
| Stock Movement, Inventory Aging, Low-Stock/Reorder, Physical Count, Stock by Location, per-SKU valuation (FIFO/LIFO/WAC) | a `products` / `inventory_items` + `stock_movements` schema with quantities, locations, and reorder points, plus screens to manage them |

The app currently models inventory only as general-ledger asset accounts (value, not units), so the
inventory **valuation/turnover** ratio is available, but anything per-item is not. Building the
product/inventory module (schema + UI + linkage to journal entries) is a separate, larger piece of work —
say the word and I can scope and build it.

_Verified: `npm run build:spa` and `tsc --noEmit` both pass clean._
