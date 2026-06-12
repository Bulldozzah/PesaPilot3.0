# Account Reports — Accuracy Review

_Reviewed: 2026-06-12. Scope: every report under **Account Reports**
(`src/routes/_app/accounting/reports.tsx`) plus the journal-entry foundation
and the default chart of accounts. Fixes in this pass are applied to the report
layer only — no stored data was changed._

## Foundation: correct ✅

- **Journal entries enforce double-entry.** Posting is blocked unless
  `debits === credits` and total > 0 (`accounting/index.tsx`). Unbalanced
  entries can only be saved as drafts.
- **Reports read posted entries only** (`is_posted = true`), so every figure is
  built from balanced entries.
- **Trial Balance** is correct and always balances; abnormal-balance flagging works.
- **Journal Report** is a faithful listing.

## Bugs found and FIXED

### 1. [High] Contra accounts inflated totals instead of netting
Every P&L figure used `Math.abs(balance)` per account. Contra accounts that ship
in the **default** chart — `4900 Sales Returns`, `4950 Sales Discounts`
(type `income`), `5900 Purchase Returns` (type `cogs`) — carry a balance in the
opposite direction. `abs()` flipped them positive and **added** them to revenue/COGS
instead of subtracting.

_Worked example_ (Sales 10,000; Returns 1,000): old report showed **Revenue
11,000**; correct is **9,000** — a 22% overstatement. **Fixed** by using signed
contributions (`−balance` for credit-normal income, `balance` for debit-normal
expense), so contra accounts net down correctly. Affected: Income Statement,
Revenue Analysis, Expense Analysis, Tax Summary.

### 2. [High] "Other Income / Other Expense" silently dropped from the P&L
The reports recognised only `income`/`revenue`, `cogs`, `expense`. Accounts typed
`other_income` / `other_expense` — including the default `7900 Gain/Loss on Sale
of Assets` — were **excluded from net income** on the Income Statement, Tax
Summary, and Balance Sheet, yet still appeared in the Trial Balance. Net income
was understated by their amount. **Fixed**: the P&L now has Other Income / Other
Expenses sections and includes them in net income everywhere.

### 3. [High] Balance Sheet didn't balance for any period after year one
Income/expense accounts are never closed to retained earnings, and the Balance
Sheet added only the **current period's** net income to equity. Prior-period
profit was missing, so for any period not starting at the business's inception
the sheet was out of balance by all accumulated prior earnings. **Fixed**: added a
"Retained Earnings (prior periods)" equity line = net income from inception to the
day before the period start. A = L + E now holds for any date range.

### 4. [Medium] A/P & A/R aging pooled all payments globally
Aging applied every payment FIFO across **all** charges regardless of
vendor/customer, so one contact's payment could clear another contact's oldest
invoice — misstating which invoices are open and their age buckets (the total was
right; the breakdown was not). **Fixed**: FIFO now runs per counterparty using the
`vendor_id` / `customer_id` already on each journal line.

### 5. [Low] General Ledger ignored opening balances
The running balance started at 0 each period, so for accounts with prior activity
(e.g. a bank account) the "Balance" column wasn't the real balance. **Fixed**: each
account now carries an opening balance forward as the first row.

### 6. [Low] Tax Summary made consistent + clearly labelled
Taxable income now equals the corrected net income (includes other income/expense,
nets contra). Added an explicit disclaimer that it is a rough flat-30% estimate.

## Not bugs, but gaps you should know about

- **"Sales Tax", "Income Tax", "Withholding Tax" are not separate reports.** Only a
  single **Tax Summary** (flat 30% income-tax estimate) exists. There is no VAT /
  sales-tax ledger (output vs input VAT), no withholding-tax tracking, and no
  per-jurisdiction rates. The default chart has WHT liability accounts (2275–2285)
  and an Income Tax Expense account, but no report aggregates them. Building proper
  VAT/WHT reports is a feature addition, not a fix — tell me the jurisdiction(s)
  and rates and I can add them.
- **Cash Flow** uses the direct method and classifies each entry by its first
  non-cash line via name/type heuristics (loan/capital → financing;
  equipment/property → investing; else operating). This is reasonable for a small
  business but can misclassify unusual entries. The opening/closing cash ties out
  to the actual cash-account movement.
- **Depreciation, accruals, inventory valuation** are only as good as the journal
  entries you post — the app does not automate them.

## How the fixes were verified

- `npm run build:spa` compiles cleanly.
- A standalone numeric test with contra + other-income entries confirmed the new
  net income matches hand-computed truth exactly, where the old logic was off.
