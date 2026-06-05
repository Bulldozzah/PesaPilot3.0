
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'cogs';
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'other_income';
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'other_expense';

ALTER TABLE public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS account_type text;

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS is_posted boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS journal_entries_touch ON public.journal_entries;
CREATE TRIGGER journal_entries_touch
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.journal_lines
  ADD COLUMN IF NOT EXISTS vendor_id uuid,
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS transaction_type text,
  ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS memo text;

CREATE TABLE IF NOT EXISTS public.account_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  account_type text NOT NULL,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_business_id, account_type, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_subcategories TO authenticated;
GRANT ALL ON public.account_subcategories TO service_role;
ALTER TABLE public.account_subcategories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS asc_own ON public.account_subcategories;
CREATE POLICY asc_own ON public.account_subcategories FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vendor_name text NOT NULL,
  email text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vendors_own ON public.vendors;
CREATE POLICY vendors_own ON public.vendors FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  customer_name text NOT NULL,
  email text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customers_own ON public.customers;
CREATE POLICY customers_own ON public.customers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.recalc_bank_account_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  affected_account_ids uuid[];
  aid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_account_ids := ARRAY[OLD.account_id];
  ELSIF TG_OP = 'UPDATE' THEN
    affected_account_ids := ARRAY[OLD.account_id, NEW.account_id];
  ELSE
    affected_account_ids := ARRAY[NEW.account_id];
  END IF;

  FOREACH aid IN ARRAY affected_account_ids LOOP
    UPDATE public.bank_accounts ba
       SET current_balance = COALESCE((
         SELECT SUM(jl.debit - jl.credit)
         FROM public.journal_lines jl
         JOIN public.journal_entries je ON je.id = jl.journal_entry_id
         WHERE jl.account_id = ba.chart_account_id
           AND je.is_posted = true
       ), 0)
     WHERE ba.chart_account_id = aid;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
