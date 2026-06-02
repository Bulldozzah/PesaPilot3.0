-- Extend bank_accounts with fields for full CRUD + chart-of-accounts link
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS account_code text,
  ADD COLUMN IF NOT EXISTS chart_account_id uuid,
  ADD COLUMN IF NOT EXISTS current_balance numeric NOT NULL DEFAULT 0;

-- Add is_active to chart_of_accounts for soft-delete
ALTER TABLE public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Trigger: assign next 4-digit account_code per business and create linked chart_of_accounts row
CREATE OR REPLACE FUNCTION public.create_chart_account_for_bank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_code int;
  new_chart_id uuid;
BEGIN
  IF NEW.account_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(account_code AS int)), 1000) + 1
      INTO next_code
      FROM public.bank_accounts
      WHERE user_business_id = NEW.user_business_id
        AND account_code ~ '^[0-9]+$';
    NEW.account_code := next_code::text;
  END IF;

  INSERT INTO public.chart_of_accounts (user_id, user_business_id, code, name, type, is_active)
  VALUES (NEW.user_id, NEW.user_business_id, NEW.account_code, NEW.name, 'asset', NEW.is_active)
  RETURNING id INTO new_chart_id;

  NEW.chart_account_id := new_chart_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_chart_account_for_bank ON public.bank_accounts;
CREATE TRIGGER trg_create_chart_account_for_bank
BEFORE INSERT ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.create_chart_account_for_bank();

-- Trigger: sync chart_of_accounts when bank_account changes
CREATE OR REPLACE FUNCTION public.sync_chart_account_for_bank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.chart_account_id IS NOT NULL THEN
    UPDATE public.chart_of_accounts
      SET name = NEW.name,
          code = NEW.account_code,
          is_active = NEW.is_active
    WHERE id = NEW.chart_account_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_chart_account_for_bank ON public.bank_accounts;
CREATE TRIGGER trg_sync_chart_account_for_bank
AFTER UPDATE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.sync_chart_account_for_bank();

-- Trigger: on bank_account delete, deactivate chart_of_accounts row instead of deleting (preserve history)
CREATE OR REPLACE FUNCTION public.delete_chart_account_for_bank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.chart_account_id IS NOT NULL THEN
    UPDATE public.chart_of_accounts
      SET is_active = false
    WHERE id = OLD.chart_account_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_chart_account_for_bank ON public.bank_accounts;
CREATE TRIGGER trg_delete_chart_account_for_bank
BEFORE DELETE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.delete_chart_account_for_bank();

-- Trigger: recalc bank_accounts.current_balance from journal_lines whenever lines change
CREATE OR REPLACE FUNCTION public.recalc_bank_account_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
         WHERE jl.account_id = ba.chart_account_id
       ), 0)
     WHERE ba.chart_account_id = aid;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_bank_balance ON public.journal_lines;
CREATE TRIGGER trg_recalc_bank_balance
AFTER INSERT OR UPDATE OR DELETE ON public.journal_lines
FOR EACH ROW EXECUTE FUNCTION public.recalc_bank_account_balance();