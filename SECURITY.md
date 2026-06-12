# PesaPilot — Security Assessment

_Assessed: 2026-06-12. Scope: app code, Supabase backend, secrets handling,
deployment config. Method: static review + live probing of the production
Supabase project with the public anon key._

## Summary

**No critical or high-severity vulnerabilities found.** PesaPilot is built on a
sound security model: all sensitive data is owner-scoped by Supabase Row Level
Security (RLS), which was verified **live** to be active and enforcing. Roles are
stored so that privilege escalation is not possible from the client. The fixes in
this pass are defense-in-depth hardening, not patches for active holes.

Severity scale: Critical / High / Medium / Low / Info.

---

## What was verified GOOD ✅

### Data isolation (RLS) — verified live
- All 29 tables have RLS **enabled**, with 51 policies.
- Every user-data table (`profiles`, `journal_entries`, `journal_lines`,
  `bank_accounts`, `chart_of_accounts`, `contacts`, `personal_transactions`,
  `personal_income`, `personal_expenses`, `savings_goals`, `wallet_budgets`,
  `business_plans`, `user_businesses`, `vendors`, `customers`, …) is scoped with
  `auth.uid() = user_id` (or owner-via-parent for `journal_lines`).
- Public reference tables (`business_categories`, `business_templates`, `lenders`,
  `regulatory_authorities`, `country_authorities`, `microfinance_institutions`)
  are intentionally world-readable (`USING (true)`) and **write-locked to admins**.
- **Live probe results** (production project, anon key, unauthenticated):
  - `profiles`, `journal_entries`, `bank_accounts`, `personal_transactions`,
    `business_plans` → **0 rows** returned (private data correctly hidden).
  - `business_categories`, `country_authorities` → rows returned (correct, public).
  - Anonymous `INSERT` into `profiles` → **HTTP 401, rejected** (correct).

### Privilege escalation — prevented
- Roles live in a separate `user_roles` table (not a column on `profiles`).
- `authenticated` has **SELECT only** on `user_roles`; there is **no** INSERT/
  UPDATE/DELETE policy, so a user cannot grant themselves `admin`.
- Roles are assigned only by the `handle_new_user` trigger (as `'user'`) or via
  the server-side `service_role`.
- `has_role()` is `SECURITY DEFINER` with `SET search_path = public` (safe).

### Secrets handling
- `.env` is git-ignored and **not** present in the current/pushed history.
- The browser only ever receives the **anon/publishable** key — this is public by
  design; security depends on RLS, which is correct.
- The `service_role` key is read from `process.env` in `client.server.ts` (never
  `VITE_`), and is confirmed **absent from the shipped JS bundle**.

### Functions & triggers
- All 8 `SECURITY DEFINER` functions set `SET search_path = public`, closing the
  search-path-injection escalation vector.

### Client input validation
- Login and registration validate with Zod (email format, password length;
  registration requires 8+ chars).

---

## Hardening applied in this pass

### [Medium] Missing HTTP security headers — FIXED
`public/.htaccess` (copied to `dist/spa/.htaccess` and into `dist/spa.zip`) now sets:
- **Content-Security-Policy** — restricts script/style/font/img/connect origins to
  `self`, the Supabase project, and Google Fonts; `frame-ancestors 'self'`,
  `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. This is the main
  anti-XSS / anti-clickjacking control.
- **Strict-Transport-Security** (HSTS, 1 year) — forces HTTPS.
- **Referrer-Policy** `strict-origin-when-cross-origin` — stops full URLs (which
  can carry tokens) leaking to third parties.
- **Permissions-Policy** — disables geolocation/camera/microphone/payment/usb.
- Kept the existing `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`.
- Added a `FilesMatch "^\."` deny rule as belt-and-suspenders against an
  accidentally-uploaded dotfile (e.g. `.env`).

Because the source lives in `public/.htaccess`, every `npm run build:spa` now
carries these headers automatically — no manual step.

> If the CSP ever blocks a feature you add later (a new third-party API, an
> analytics script, an embedded map), widen the matching `*-src` directive — don't
> remove the whole header.

---

## Recommendations (require your action — cannot be done from code)

### [Low] Rotate the anon key that was in old git history (optional)
An earlier commit in the **previous** history included `.env` containing the
**anon** key. The anon key is public by design (it ships in the browser anyway),
so this is low risk — but if you want a clean slate you can roll it in
Supabase → Settings → API. No service_role key or DB password was ever committed.

### [Low] Confirm "Confirm email" is ON
Supabase → Authentication → Providers → Email. With it on, accounts must verify
before they can sign in, which blocks signup with someone else's address. The code
handles both modes.

### [Low] Raise the password policy
Supabase → Authentication → Policies: require 8+ chars and leaked-password
protection (HaveIBeenPwned). The app already asks for 8+ on registration; enforcing
it server-side closes the gap for API-direct signups.

### [Info] Restrict by rate-limiting / CAPTCHA
For a finance app, consider enabling Supabase Auth CAPTCHA (hCaptcha/Turnstile) to
slow credential-stuffing against the login endpoint.

### [Info] Keep the service_role key server-only
It must only ever be set as `SUPABASE_SERVICE_ROLE_KEY` in a server environment
(Railway/VPS), never as a `VITE_`-prefixed variable. The static Hostinger SPA does
not use it and must not be given it.

---

## Residual risk

The static SPA on Hostinger talks directly to Supabase from the browser. That is a
supported, safe architecture **only because** RLS is the real enforcement layer —
which it is here. Any new table you add MUST get RLS enabled and owner-scoped
policies, or it will be globally readable/writable with the public anon key. Treat
"enable RLS + add policy" as part of every new-table migration.
