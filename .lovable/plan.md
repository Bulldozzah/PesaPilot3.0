# Double-Entry Accounting — Full Rebuild Plan

## 1. Schema migration

Add columns + tables to support the new spec while keeping existing data working.

**`chart_of_accounts`** (rename concept → "accounts" stays as table name `chart_of_accounts`):
- add `subcategory text`
- add `account_type text` derived from existing `type` enum (keep `type`, add `account_type` as text mirror for the 8 categories: Asset, Liability, Equity, Revenue, COGS, Expense, Other Income, Other Expense)
- extend `account_type_enum` to include `cogs`, `other_income`, `other_expense` (currently only asset/liability/equity/income/expense)

**`journal_entries`**:
- add `is_posted boolean default false`
- add `reference_number text` (alias for existing `reference`, or rename usage)
- add `updated_at timestamptz`

**`journal_lines`**:
- add `vendor_id uuid`, `customer_id uuid`, `transaction_type text`, `tax_amount numeric default 0`, `memo text`
- existing `debit`/`credit` columns kept (UI maps debit_amount→debit)

**New tables**:
- `account_subcategories` (user_business_id, account_type, name, display_order, is_system)
- `vendors` (user_business_id, vendor_name, email, phone, is_active)
- `customers` (user_business_id, customer_name, email, phone, is_active)

All with RLS scoped to `auth.uid()` via `user_businesses` join, plus GRANTs.

**Trigger updates**: keep existing bank-account → COA triggers; update `recalc_bank_account_balance` to only count `is_posted = true` entries.

## 2. Default COA seeding

Move the 197-account list + 8 default subcategories into `src/lib/default-coa.ts`. On COA tab "Initialize Defaults" click, bulk-insert per business.

## 3. Rewrite `/accounting` route

Replace `src/routes/_app/accounting/journal.tsx` and `reports.tsx` with a single route `src/routes/_app/accounting.tsx` (and remove `_app/accounting/`) containing:

- **Business selector** (top, `user_businesses`)
- **4 tabs**: Trial Balance (default), Journal Entries, General Ledger, Chart of Accounts

### Tab 1 — Trial Balance
Aggregate posted journal lines per account, show debit/credit columns, color-coded type badges, totals + balanced indicator. Empty states for no accounts / no posted entries.

### Tab 2 — Journal Entries
- Header: COA reference modal, Bulk Import modal, New Entry toggle
- Entry form: date, ref (auto-gen `JE-YYYY-NNNN`), description, multi-line table (account, description, contact (vendor/customer based on AP/AR), txn type, tax, debit, credit, remove)
- Auto-clear opposite side when typing debit/credit
- Footer: totals + balanced indicator, Save as Draft / Save & Post buttons
- Validation: balanced for post, AP needs vendor, AR needs customer, ≥2 lines
- List below: posted/draft badge, post button for drafts, delete, expandable lines
- Bulk import: paste TSV/CSV (Entry/Day/Date/Debit Account/Debit/Credit Account/Credit), match account names, progress + errors

### Tab 3 — General Ledger
2-column layout: account list (grouped by type) on left, ledger table on right with running balance for selected account (posted only).

### Tab 4 — Chart of Accounts
- Header actions: COA Guide modal, Initialize Defaults (when empty), Manage Subcategories toggle, Add Account toggle
- Subcategory manager: add/delete per type (system ones locked)
- Add Account: 5-col grid (type, subcategory, name, prefix+3-digit code, add). Bank/Wallet/Cash subcategory redirects to bank-accounts route
- Accounts list grouped by type with code range + total balance per group; bank-linked accounts highlighted

## 4. Sidebar / nav

Update sidebar to point to `/accounting` (single link) instead of `/accounting/journal` + `/accounting/reports`. Keep `/accounting/reports` as a separate Reports page (out of scope here — leave intact).

## Technical details

- Use existing `chart_of_accounts.type` enum where possible; add new enum values via `ALTER TYPE ... ADD VALUE` for cogs/other_income/other_expense
- All forms use `react-hook-form` + zod where practical, but keep inline state for the dynamic line editor (matches journal complexity)
- Numbers via `formatMoney`
- Posted-only filtering applied in Trial Balance, General Ledger, and bank balance trigger
- File organization:
  - `src/routes/_app/accounting.tsx` — main page + tab orchestration
  - `src/components/accounting/TrialBalance.tsx`
  - `src/components/accounting/JournalEntries.tsx`
  - `src/components/accounting/GeneralLedger.tsx`
  - `src/components/accounting/ChartOfAccounts.tsx`
  - `src/components/accounting/BulkImportDialog.tsx`
  - `src/components/accounting/AccountGuideDialog.tsx`
  - `src/lib/default-coa.ts`

## Out of scope (defer unless asked)

- Inventory flow validation (Raw → WIP → Finished → COGS) — complex; will stub with TODO
- Reports tab (P&L, Balance Sheet, Cash Flow) — already lives at `/accounting/reports`, leave as-is
- Recurring entries, attachments, audit trail
