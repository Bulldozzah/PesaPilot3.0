
-- ============================================================
-- FILE: 20260601125938_bd9cbeed-783e-4c44-8965-33f7088825ad.sql
-- ============================================================


-- ============== ENUMS ==============
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.account_type AS ENUM ('asset','liability','equity','income','expense');
CREATE TYPE public.business_difficulty AS ENUM ('easy','medium','hard');
CREATE TYPE public.contact_type AS ENUM ('vendor','customer');
CREATE TYPE public.personal_tx_type AS ENUM ('income','expense');
CREATE TYPE public.bank_account_type AS ENUM ('checking','savings','mobile_money','cash');
CREATE TYPE public.lender_type AS ENUM ('bank','microfinance','sacco','digital','government');

-- ============== PROFILES ==============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  country TEXT DEFAULT 'Kenya',
  currency TEXT DEFAULT 'KES',
  phone TEXT,
  business_name TEXT,
  avatar_url TEXT,
  completed_onboarding BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============== ROLES ==============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============== AUTO-CREATE PROFILE TRIGGER ==============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== BUSINESS CATEGORIES / TEMPLATES ==============
CREATE TABLE public.business_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_categories TO anon, authenticated;
GRANT ALL ON public.business_categories TO service_role;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_read_all" ON public.business_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cat_admin_write" ON public.business_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.business_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.business_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  startup_cost_min NUMERIC(14,2) DEFAULT 0,
  startup_cost_max NUMERIC(14,2) DEFAULT 0,
  monthly_profit_min NUMERIC(14,2) DEFAULT 0,
  monthly_profit_max NUMERIC(14,2) DEFAULT 0,
  difficulty public.business_difficulty DEFAULT 'medium',
  time_to_profit_months INT DEFAULT 3,
  currency TEXT DEFAULT 'KES',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_templates TO anon, authenticated;
GRANT ALL ON public.business_templates TO service_role;
ALTER TABLE public.business_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tpl_read_all" ON public.business_templates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tpl_admin_write" ON public.business_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.business_template_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.business_templates(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  est_days INT DEFAULT 1,
  UNIQUE(template_id, step_number)
);
GRANT SELECT ON public.business_template_steps TO anon, authenticated;
GRANT ALL ON public.business_template_steps TO service_role;
ALTER TABLE public.business_template_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tplstep_read_all" ON public.business_template_steps FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tplstep_admin_write" ON public.business_template_steps FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============== USER BUSINESSES ==============
CREATE TABLE public.user_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.business_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT DEFAULT 'KES',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_businesses TO authenticated;
GRANT ALL ON public.user_businesses TO service_role;
ALTER TABLE public.user_businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ub_own" ON public.user_businesses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_roadmap_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_business_id UUID NOT NULL REFERENCES public.user_businesses(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.business_template_steps(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(user_business_id, step_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roadmap_progress TO authenticated;
GRANT ALL ON public.user_roadmap_progress TO service_role;
ALTER TABLE public.user_roadmap_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rp_own" ON public.user_roadmap_progress FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_businesses ub WHERE ub.id = user_business_id AND ub.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_businesses ub WHERE ub.id = user_business_id AND ub.user_id = auth.uid()));

-- ============== ACCOUNTING ==============
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_business_id UUID REFERENCES public.user_businesses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type public.account_type NOT NULL,
  is_personal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chart_of_accounts TO authenticated;
GRANT ALL ON public.chart_of_accounts TO service_role;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coa_own" ON public.chart_of_accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_business_id UUID REFERENCES public.user_businesses(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "je_own" ON public.journal_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  description TEXT,
  CHECK (debit >= 0 AND credit >= 0),
  CHECK (NOT (debit > 0 AND credit > 0))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_lines TO authenticated;
GRANT ALL ON public.journal_lines TO service_role;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jl_own" ON public.journal_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND je.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND je.user_id = auth.uid()));

-- ============== BANK ACCOUNTS / CONTACTS ==============
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_business_id UUID REFERENCES public.user_businesses(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  type public.bank_account_type NOT NULL DEFAULT 'checking',
  currency TEXT DEFAULT 'KES',
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ba_own" ON public.bank_accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_business_id UUID REFERENCES public.user_businesses(id) ON DELETE CASCADE,
  type public.contact_type NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct_own" ON public.contacts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============== PERSONAL FINANCE ==============
CREATE TABLE public.personal_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.personal_tx_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_transactions TO authenticated;
GRANT ALL ON public.personal_transactions TO service_role;
ALTER TABLE public.personal_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pt_own" ON public.personal_transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(14,2) NOT NULL,
  current_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_goals TO authenticated;
GRANT ALL ON public.savings_goals TO service_role;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sg_own" ON public.savings_goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.wallet_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount_planned NUMERIC(14,2) NOT NULL,
  month DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_budgets TO authenticated;
GRANT ALL ON public.wallet_budgets TO service_role;
ALTER TABLE public.wallet_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wb_own" ON public.wallet_budgets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============== LENDERS (PUBLIC DIRECTORY) ==============
CREATE TABLE public.lenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Kenya',
  type public.lender_type NOT NULL DEFAULT 'bank',
  description TEXT,
  min_loan NUMERIC(14,2),
  max_loan NUMERIC(14,2),
  interest_rate_min NUMERIC(6,2),
  interest_rate_max NUMERIC(6,2),
  requirements TEXT,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lenders TO anon, authenticated;
GRANT ALL ON public.lenders TO service_role;
ALTER TABLE public.lenders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ln_read_all" ON public.lenders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ln_admin_write" ON public.lenders FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============== REGULATORY AUTHORITIES ==============
CREATE TABLE public.regulatory_authorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.regulatory_authorities TO anon, authenticated;
GRANT ALL ON public.regulatory_authorities TO service_role;
ALTER TABLE public.regulatory_authorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ra_read_all" ON public.regulatory_authorities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ra_admin_write" ON public.regulatory_authorities FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============== BUSINESS PLANS ==============
CREATE TABLE public.business_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_business_id UUID REFERENCES public.user_businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_plans TO authenticated;
GRANT ALL ON public.business_plans TO service_role;
ALTER TABLE public.business_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bp_own" ON public.business_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER bp_touch BEFORE UPDATE ON public.business_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- FILE: 20260601130004_0e114b15-72ec-4a68-ae57-7f15f2a46847.sql
-- ============================================================


REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;

-- ============================================================
-- FILE: 20260601132154_7b163c67-3653-49f9-8244-56a3694cc5df.sql
-- ============================================================

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon;

CREATE POLICY "user_roles_no_user_insert" ON public.user_roles
  FOR INSERT TO authenticated, anon WITH CHECK (false);

CREATE POLICY "user_roles_no_user_update" ON public.user_roles
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

CREATE POLICY "user_roles_no_user_delete" ON public.user_roles
  FOR DELETE TO authenticated, anon USING (false);

-- ============================================================
-- FILE: 20260601144415_d89a1064-4891-420e-96dd-d9dd17b3f9db.sql
-- ============================================================

-- Wipe and reseed
DELETE FROM business_template_steps;
DELETE FROM business_templates;
DELETE FROM business_categories;

ALTER TABLE business_categories ADD COLUMN IF NOT EXISTS emoji text;
ALTER TABLE business_templates ADD COLUMN IF NOT EXISTS overview_content text;
ALTER TABLE business_templates ADD COLUMN IF NOT EXISTS overview_video_url text;
ALTER TABLE business_templates ADD COLUMN IF NOT EXISTS overview_web_url text;
ALTER TABLE business_templates ADD COLUMN IF NOT EXISTS overview_pdf_url text;

INSERT INTO business_categories (id,name,slug,icon,emoji,sort_order) VALUES
 ('5121c6db-3d99-48bf-bb0f-508b6c677f28','Agriculture & Farming','agriculture-farming','🌾','🌾',0),
 ('0540cdc9-902c-42fc-b2d5-852125119ef5','Food Processing & Hospitality','food-hospitality','🍽️','🍽️',1),
 ('f1b62c5a-fa46-4ba3-b6a0-18e218128f81','Retail & Trading','retail-trading','🛒','🛒',2),
 ('97127a4a-26fa-4249-9325-5996171d5e79','Services & Personal Care','services-personal-care','💆','💆',3),
 ('45bd9ab2-d65a-4dc6-a4ea-5f4dd33d8832','Manufacturing & Crafts','manufacturing-crafts','🔨','🔨',4),
 ('cbed4b42-714f-4db2-b3b6-dfd916027dcd','Digital & Creative','digital-creative','💻','💻',5),
 ('95f42a7a-4510-4c01-be8e-ab8db84954c5','Transport & Logistics','transport-logistics','🚚','🚚',6),
 ('4ae782aa-3e1e-4e01-b9b6-927de19f7b1b','Construction & Real Estate','construction-real-estate','🏗️','🏗️',7),
 ('cd594898-1ac8-4f1a-b82c-770a175f1b0f','Green & Environmental','green-environmental','🌱','🌱',8),
 ('bb80b169-9dba-4b9a-85dd-97ed20042c21','Health & Social Services','health-social-services','🏥','🏥',9);

-- ============================================================
-- FILE: 20260601145536_d154d852-1e39-4b79-8e9d-6311da36c90f.sql
-- ============================================================

ALTER TABLE public.user_businesses
  ADD COLUMN IF NOT EXISTS budget numeric NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS expected_monthly_profit numeric;

-- ============================================================
-- FILE: 20260601150712_a84096bd-120d-42df-af9c-b0261f2de54e.sql
-- ============================================================


CREATE TABLE public.country_authorities (
  id BIGSERIAL PRIMARY KEY,
  country_code CHAR(2) NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  authority_name TEXT NOT NULL,
  authority_website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.country_authorities TO anon, authenticated;
GRANT ALL ON public.country_authorities TO service_role;

ALTER TABLE public.country_authorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "country_authorities_read_all" ON public.country_authorities
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "country_authorities_admin_write" ON public.country_authorities
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- step_progress for per-business roadmap step completion
CREATE TABLE public.step_progress (
  id BIGSERIAL PRIMARY KEY,
  user_business_id UUID NOT NULL REFERENCES public.user_businesses(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_title TEXT,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  checklist_status JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_business_id, step_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.step_progress TO authenticated;
GRANT ALL ON public.step_progress TO service_role;

ALTER TABLE public.step_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_own" ON public.step_progress
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_businesses ub WHERE ub.id = step_progress.user_business_id AND ub.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_businesses ub WHERE ub.id = step_progress.user_business_id AND ub.user_id = auth.uid()));

CREATE TRIGGER trg_step_progress_updated_at
  BEFORE UPDATE ON public.step_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Also add country_code to profiles for authority lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code TEXT;

-- ============================================================
-- FILE: 20260602090346_2807b509-4015-4411-b1e5-ea67d0b36b2f.sql
-- ============================================================

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

-- ============================================================
-- FILE: 20260602090401_741bf297-74e2-4509-8c62-7876e9bcf8c5.sql
-- ============================================================

ALTER FUNCTION public.create_chart_account_for_bank() SECURITY INVOKER;
ALTER FUNCTION public.sync_chart_account_for_bank() SECURITY INVOKER;
ALTER FUNCTION public.delete_chart_account_for_bank() SECURITY INVOKER;
ALTER FUNCTION public.recalc_bank_account_balance() SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.create_chart_account_for_bank() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_chart_account_for_bank() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_chart_account_for_bank() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_bank_account_balance() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- FILE: 20260602094149_e13707a6-6a93-4224-8ea1-0c28b87492aa.sql
-- ============================================================


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

-- ============================================================
-- FILE: 20260602131212_d54667fd-1c4f-4290-8bf8-94463b1439b4.sql
-- ============================================================


-- Personal income (month/year scoped)
CREATE TABLE public.personal_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL,
  amount numeric NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('Monthly','Weekly','Yearly','One-time')),
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_income TO authenticated;
GRANT ALL ON public.personal_income TO service_role;
ALTER TABLE public.personal_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY pi_own ON public.personal_income FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Personal expenses (date-based)
CREATE TABLE public.personal_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  amount numeric NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_expenses TO authenticated;
GRANT ALL ON public.personal_expenses TO service_role;
ALTER TABLE public.personal_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY pe_own ON public.personal_expenses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Personal budgets (month/year scoped)
CREATE TABLE public.personal_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  limit_amount numeric NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, month, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_budgets TO authenticated;
GRANT ALL ON public.personal_budgets TO service_role;
ALTER TABLE public.personal_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY pb_own ON public.personal_budgets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Extend savings_goals with month/year + deadline (keep existing)
ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS month int CHECK (month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS year int,
  ADD COLUMN IF NOT EXISTS deadline date;

-- Expense categories
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY ec_select ON public.expense_categories FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY ec_insert ON public.expense_categories FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY ec_update ON public.expense_categories FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND is_default = false)
  WITH CHECK (auth.uid() = user_id AND is_default = false);
CREATE POLICY ec_delete ON public.expense_categories FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND is_default = false);

-- Seed defaults for a user
CREATE OR REPLACE FUNCTION public.seed_default_expense_categories(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.expense_categories (user_id, name, is_default) VALUES
    (_user_id,'Housing',true),(_user_id,'Transportation',true),(_user_id,'Food',true),
    (_user_id,'Utilities',true),(_user_id,'Healthcare',true),(_user_id,'Insurance',true),
    (_user_id,'Debt Payments',true),(_user_id,'Entertainment',true),(_user_id,'Clothing',true),
    (_user_id,'Personal Care',true),(_user_id,'Education',true),(_user_id,'Gifts',true),
    (_user_id,'Savings',true),(_user_id,'Investments',true),(_user_id,'Childcare',true),
    (_user_id,'Pet Care',true),(_user_id,'Travel',true),(_user_id,'Other',true)
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_expense_categories(uuid) TO authenticated;

-- Wire into new-user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  PERFORM public.seed_default_expense_categories(NEW.id);
  RETURN NEW;
END;
$$;

-- ============================================================
-- FILE: 20260602131223_d6ebec33-0c0d-47db-a15e-bc7894742c43.sql
-- ============================================================


REVOKE EXECUTE ON FUNCTION public.seed_default_expense_categories(uuid) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- FILE: 20260602201158_badb1181-ca9e-4594-aeaa-85336f81ff74.sql
-- ============================================================

DELETE FROM public.chart_of_accounts WHERE user_business_id IS NULL;
DELETE FROM public.account_subcategories WHERE user_business_id IS NULL;

-- ============================================================
-- FILE: 20260606_country_authorities.sql
-- ============================================================

-- Create country_authorities table for business registration links
CREATE TABLE IF NOT EXISTS country_authorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL UNIQUE,
  country_name VARCHAR(100) NOT NULL,
  authority_name VARCHAR(200) NOT NULL,
  authority_website VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookup by country code
CREATE INDEX IF NOT EXISTS idx_country_authorities_code ON country_authorities(country_code);

-- Enable RLS
ALTER TABLE country_authorities ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read (public reference data)
CREATE POLICY "Anyone can read country authorities"
  ON country_authorities FOR SELECT
  TO authenticated
  USING (true);

-- Seed data for Country Licensing Authorities
INSERT INTO country_authorities (country_code, country_name, authority_name, authority_website) VALUES
-- A
('AF', 'Afghanistan', 'Central Business Registry', 'https://acbr.gov.af'),
('AL', 'Albania', 'National Business Center (QKB)', 'https://qkb.gov.al'),
('DZ', 'Algeria', 'National Centre of Trade Register (CNRC)', 'https://www.cnrc.dz'),
('AD', 'Andorra', 'Registre de Societats', 'https://www.registre.ad'),
('AO', 'Angola', 'Guiché Único (GUE)', 'https://www.gue.gov.ao'),
('AG', 'Antigua & Barbuda', 'Intellectual Property & Companies Office', 'https://ipo.gov.ag'),
('AR', 'Argentina', 'Inspección General de Justicia (IGJ)', 'https://www.argentina.gob.ar/igj'),
('AM', 'Armenia', 'State Register of Legal Entities', 'https://www.e-register.am'),
('AU', 'Australia', 'ASIC – Australian Securities & Investments Commission', 'https://asic.gov.au'),
('AT', 'Austria', 'Firmenbuch / Business Register', 'https://www.justiz.gv.at/firmenbuch'),
('AZ', 'Azerbaijan', 'State Tax Service Register', 'https://www.e-taxes.gov.az'),

-- B
('BS', 'Bahamas', 'Registrar General''s Dept', 'https://www.bahamas.gov.bs'),
('BH', 'Bahrain', 'Ministry of Industry & Commerce (Sijilat)', 'https://www.sijilat.bh'),
('BD', 'Bangladesh', 'Registrar of Joint Stock Companies (RJSC)', 'https://www.roc.gov.bd'),
('BB', 'Barbados', 'Corporate Affairs & Intellectual Property Office', 'https://caipo.gov.bb'),
('BY', 'Belarus', 'Unified State Register', 'https://egr.gov.by'),
('BE', 'Belgium', 'Crossroads Bank for Enterprises', 'https://kbopub.economie.fgov.be'),
('BZ', 'Belize', 'Belize Companies Registry', 'https://www.companies.gov.bz'),
('BJ', 'Benin', 'GUFE – APIEX', 'https://gufe.apiex.bj'),
('BT', 'Bhutan', 'Ministry of Economic Affairs', 'https://www.moea.gov.bt'),
('BO', 'Bolivia', 'Registro de Comercio de Bolivia', 'https://www.fundempresa.org.bo'),
('BA', 'Bosnia & Herzegovina', 'Business Registers', 'https://www.fipa.gov.ba'),
('BW', 'Botswana', 'Companies & Intellectual Property Authority', 'https://www.cipa.co.bw'),
('BR', 'Brazil', 'Federal Revenue (CNPJ)', 'https://www.gov.br/receitafederal'),
('BN', 'Brunei', 'Registry of Companies (ROCB)', 'https://www.mofe.gov.bn'),
('BG', 'Bulgaria', 'Commercial Register', 'https://portal.registryagency.bg'),
('BF', 'Burkina Faso', 'CEPICI / Guichet Unique', 'https://monentreprise.bf'),
('BI', 'Burundi', 'API Burundi', 'https://www.api.bi'),

-- C
('CV', 'Cabo Verde', 'Casa do Cidadão', 'https://portondinosilha.cv'),
('KH', 'Cambodia', 'Ministry of Commerce – Business Registration', 'https://www.businessregistration.moc.gov.kh'),
('CM', 'Cameroon', 'OAPI / Business Register', 'https://www.mincommerce.cm'),
('CA', 'Canada', 'Corporations Canada', 'https://www.ic.gc.ca'),
('CF', 'Central African Republic', 'Ministry of Commerce', NULL),
('TD', 'Chad', 'ANIE – Investment Agency', 'https://www.anie-tchad.com'),
('CL', 'Chile', 'Registro de Empresas', 'https://www.registrodeempresasysociedades.cl'),
('CN', 'China', 'National Enterprise Credit Information System', 'https://www.gsxt.gov.cn'),
('CO', 'Colombia', 'RUES – Unified Business Registry', 'https://www.rues.org.co'),
('KM', 'Comoros', 'API Comores', 'https://investcomoros.com'),
('CG', 'Congo (Republic)', 'API Congo', 'https://apicongo.com'),
('CD', 'Congo (DRC)', 'GUFE – One Stop Shop', 'https://www.guichetunique.cd'),
('CR', 'Costa Rica', 'National Registry', 'https://www.rnpdigital.com'),
('CI', 'Côte d''Ivoire', 'CEPICI', 'https://www.cepici.gouv.ci'),
('HR', 'Croatia', 'Court Register', 'https://sudreg.pravosudje.hr'),
('CU', 'Cuba', 'Ministry of Justice', 'http://www.minjus.gob.cu'),
('CY', 'Cyprus', 'Registrar of Companies', 'https://efiling.drcor.mcit.gov.cy'),
('CZ', 'Czech Republic', 'Business Register', 'https://or.justice.cz'),

-- D
('DK', 'Denmark', 'Central Business Register (CVR)', 'https://cvr.dk'),
('DJ', 'Djibouti', 'ODPIC', 'http://www.odpic.dj'),
('DM', 'Dominica', 'Companies & IP Office', 'https://cipo.gov.dm'),
('DO', 'Dominican Republic', 'ONAPI / DGII', 'https://www.dgi.gov.do'),

-- E
('EC', 'Ecuador', 'Superintendencia de Compañías', 'https://www.supercias.gob.ec'),
('EG', 'Egypt', 'GAFI', 'https://www.gafi.gov.eg'),
('SV', 'El Salvador', 'National Registry (CNR)', 'https://www.cnr.gob.sv'),
('GQ', 'Equatorial Guinea', 'Ministry of Commerce', NULL),
('ER', 'Eritrea', 'Ministry of Trade', NULL),
('EE', 'Estonia', 'e-Business Register', 'https://ariregister.rik.ee'),
('SZ', 'Eswatini', 'Company Registry', 'https://www.cra.org.sz'),
('ET', 'Ethiopia', 'Ministry of Trade & Industry', 'https://www.moti.gov.et'),

-- F
('FJ', 'Fiji', 'Business Registration', 'https://www.egov.gov.fj'),
('FI', 'Finland', 'Trade Register', 'https://www.ytj.fi'),
('FR', 'France', 'Infogreffe', 'https://www.infogreffe.fr'),

-- G
('GA', 'Gabon', 'CDE – Enterprise Development Center', 'https://www.cde.ga'),
('GM', 'Gambia', 'GIEPA', 'https://giepa.gm'),
('GE', 'Georgia', 'National Agency of Public Registry', 'https://www.napr.gov.ge'),
('DE', 'Germany', 'Unternehmensregister', 'https://www.unternehmensregister.de'),
('GH', 'Ghana', 'Registrar General''s Department', 'https://rgd.gov.gh'),
('GR', 'Greece', 'General Commercial Registry (GEMI)', 'https://www.businessregistry.gr'),
('GD', 'Grenada', 'Corporate Affairs', 'https://www.registry.gov.gd'),
('GT', 'Guatemala', 'Registro Mercantil', 'https://www.rgm.gob.gt'),
('GN', 'Guinea', 'APIP', 'https://www.apiguinee.com'),
('GW', 'Guinea-Bissau', 'CE-Invest', 'https://www.ceinvestgb.com'),
('GY', 'Guyana', 'Deeds & Commercial Registry', 'https://www.dcra.gov.gy'),

-- H
('HT', 'Haiti', 'Ministry of Commerce', 'https://www.mci.gouv.ht'),
('HN', 'Honduras', 'Mercantile Registry', 'https://www.rnp.hn'),
('HK', 'Hong Kong', 'Companies Registry', 'https://www.cr.gov.hk'),
('HU', 'Hungary', 'Company Information Service', 'https://www.e-cegjegyzek.hu'),

-- I
('IS', 'Iceland', 'Company Register', 'https://www.rsk.is/fyrirtaekjaskra'),
('IN', 'India', 'MCA', 'https://www.mca.gov.in'),
('ID', 'Indonesia', 'AHU Online', 'https://ahu.go.id'),
('IR', 'Iran', 'Company Registration Portal', 'https://irsherkat.ssaa.ir'),
('IQ', 'Iraq', 'Companies Registrar', 'https://moci.gov.iq'),
('IE', 'Ireland', 'Companies Registration Office', 'https://www.cro.ie'),
('IL', 'Israel', 'Registrar of Companies', 'https://www.justice.gov.il'),
('IT', 'Italy', 'Registro Imprese', 'https://www.registroimprese.it'),

-- J
('JM', 'Jamaica', 'Companies Office of Jamaica', 'https://www.orcjamaica.com'),
('JP', 'Japan', 'National Tax Agency Corporate Number', 'https://www.houjin-bangou.nta.go.jp'),
('JO', 'Jordan', 'Companies Control Department', 'https://www.ccd.gov.jo'),

-- K
('KZ', 'Kazakhstan', 'eGov Business Registry', 'https://egov.kz'),
('KE', 'Kenya', 'eCitizen Business Registration', 'https://www.ecitizen.go.ke'),
('KI', 'Kiribati', 'Ministry of Commerce', NULL),
('KW', 'Kuwait', 'Ministry of Commerce', 'https://www.moci.gov.kw'),
('KG', 'Kyrgyzstan', 'Ministry of Justice', 'https://minjust.gov.kg'),

-- L
('LA', 'Laos', 'Enterprise Registry', 'https://www.erc.moic.gov.la'),
('LV', 'Latvia', 'Enterprise Register', 'https://www.ur.gov.lv'),
('LB', 'Lebanon', 'Commercial Register', 'https://www.justice.gov.lb'),
('LS', 'Lesotho', 'One-Stop Business Registration', 'https://osb.ls'),
('LR', 'Liberia', 'Liberia Business Registry', 'https://www.lbr.gov.lr'),
('LY', 'Libya', 'Commercial Registry', NULL),
('LI', 'Liechtenstein', 'Public Registry Office', 'https://www.oera.li'),
('LT', 'Lithuania', 'Register of Legal Entities', 'https://www.registrucentras.lt'),
('LU', 'Luxembourg', 'LBR', 'https://www.lbr.lu'),

-- M
('MG', 'Madagascar', 'EDBM', 'https://www.edbm.mg'),
('MW', 'Malawi', 'Registrar General', 'https://www.registrargeneral.gov.mw'),
('MY', 'Malaysia', 'SSM', 'https://www.ssm.com.my'),
('MV', 'Maldives', 'Ministry of Economic Development', 'https://business.egov.mv'),
('ML', 'Mali', 'API Mali', 'https://www.apimali.gov.ml'),
('MT', 'Malta', 'Malta Business Registry', 'https://mbr.mt'),
('MH', 'Marshall Islands', 'Registrar of Corporations', 'https://www.register-iri.com'),
('MR', 'Mauritania', 'ONAPE / Commercial Registry', NULL),
('MU', 'Mauritius', 'Corporate & Business Registration Dept', 'https://companies.govmu.org'),
('MX', 'Mexico', 'SIEM', 'https://www.siem.gob.mx'),
('FM', 'Micronesia', 'FSM Registrar', 'https://www.fsmlaw.org'),
('MD', 'Moldova', 'State Registration Chamber', 'https://www.asp.gov.md'),
('MC', 'Monaco', 'RCI Monaco', 'https://www.monaco-entreprises.gouv.mc'),
('MN', 'Mongolia', 'Legal Entity Registration', 'https://burtgel.gov.mn'),
('ME', 'Montenegro', 'CRPS', 'https://www.crps.me'),
('MA', 'Morocco', 'OMPIC', 'https://www.directinfo.ma'),
('MZ', 'Mozambique', 'Conservatória', 'https://www.portaldogoverno.gov.mz'),
('MM', 'Myanmar', 'DICA', 'https://www.myco.dica.gov.mm'),

-- N
('NA', 'Namibia', 'BIPA', 'https://www.bipa.na'),
('NR', 'Nauru', 'Corporate Registry', NULL),
('NP', 'Nepal', 'Office of Company Registrar', 'https://ocr.gov.np'),
('NL', 'Netherlands', 'Kamer van Koophandel', 'https://www.kvk.nl'),
('NZ', 'New Zealand', 'Companies Office', 'https://companies-register.companiesoffice.govt.nz'),
('NI', 'Nicaragua', 'Ministry of Development', 'https://www.mific.gob.ni'),
('NE', 'Niger', 'ANPIPS', 'https://anpips.ne'),
('NG', 'Nigeria', 'CAC', 'https://www.cac.gov.ng'),
('MK', 'North Macedonia', 'Central Registry', 'https://www.crm.com.mk'),
('NO', 'Norway', 'Brønnøysund Register Centre', 'https://www.brreg.no'),

-- O
('OM', 'Oman', 'Ministry of Commerce', 'https://www.business.gov.om'),

-- P
('PK', 'Pakistan', 'SECP', 'https://www.secp.gov.pk'),
('PW', 'Palau', 'Registrar of Corporations', 'https://www.palaugov.pw'),
('PA', 'Panama', 'Panama Registry', 'https://www.registro-publico.gob.pa'),
('PG', 'Papua New Guinea', 'IPA Registry', 'https://www.ipa.gov.pg'),
('PY', 'Paraguay', 'RUC — Taxpayer Registry', 'https://www.hacienda.gov.py'),
('PE', 'Peru', 'SUNARP', 'https://www.sunarp.gob.pe'),
('PH', 'Philippines', 'SEC (eSPARC)', 'https://esparc.sec.gov.ph'),
('PL', 'Poland', 'KRS', 'https://ekrs.ms.gov.pl'),
('PT', 'Portugal', 'RNPC / Corporate Registry', 'https://www.irn.mj.pt'),

-- Q
('QA', 'Qatar', 'Ministry of Commerce', 'https://www.moci.gov.qa'),

-- R
('RO', 'Romania', 'ONRC', 'https://www.onrc.ro'),
('RU', 'Russia', 'Federal Tax Service (EGRUL)', 'https://egrul.nalog.ru'),
('RW', 'Rwanda', 'ORG (RDB)', 'https://org.rdb.rw'),

-- S
('KN', 'Saint Kitts & Nevis', 'Registrar of Companies', 'https://www.gov.kn'),
('LC', 'Saint Lucia', 'Registry of Companies', 'https://www.companiesregistry.govt.lc'),
('VC', 'Saint Vincent & Grenadines', 'Commerce Registry', 'https://www.gov.vc'),
('WS', 'Samoa', 'Samoa Companies Registry', 'https://www.businessregistries.gov.ws'),
('SM', 'San Marino', 'Registro delle Imprese', 'https://www.agency.sm'),
('ST', 'São Tomé & Príncipe', 'GUFE', 'https://gufe.st'),
('SA', 'Saudi Arabia', 'Ministry of Commerce', 'https://mc.gov.sa'),
('SN', 'Senegal', 'APIX', 'https://www.apix.sn'),
('RS', 'Serbia', 'SBRA', 'https://www.apr.gov.rs'),
('SC', 'Seychelles', 'SBR / FSA', 'https://www.sbr.gov.sc'),
('SL', 'Sierra Leone', 'Office of Registrar General', 'https://www.oarg.gov.sl'),
('SG', 'Singapore', 'ACRA', 'https://www.acra.gov.sg'),
('SK', 'Slovakia', 'Business Register', 'https://www.orsr.sk'),
('SI', 'Slovenia', 'AJPES', 'https://www.ajpes.si'),
('SB', 'Solomon Islands', 'Company Haus', 'https://companyhaus.gov.sb'),
('SO', 'Somalia', 'Ministry of Commerce', NULL),
('ZA', 'South Africa', 'CIPC', 'https://www.cipc.co.za'),
('KR', 'South Korea', 'KOREA Biz Portal', 'https://www.startbiz.go.kr'),
('SS', 'South Sudan', 'Business Registry (MOJ)', NULL),
('ES', 'Spain', 'Registro Mercantil', 'https://www.rmc.es'),
('LK', 'Sri Lanka', 'Department of Registrar of Companies', 'https://www.drc.gov.lk'),
('SD', 'Sudan', 'Commercial Registrar', NULL),
('SR', 'Suriname', 'Chamber of Commerce', 'https://www.surinamechamber.com'),
('SE', 'Sweden', 'Bolagsverket', 'https://www.bolagsverket.se'),
('CH', 'Switzerland', 'Zefix', 'https://www.zefix.ch'),
('SY', 'Syria', 'Ministry of Internal Trade', NULL),

-- T
('TW', 'Taiwan', 'MOEA Business Registration', 'https://gcis.nat.gov.tw'),
('TJ', 'Tajikistan', 'Tax Committee Register', 'https://www.andoz.tj'),
('TZ', 'Tanzania', 'BRELA', 'https://www.brela.go.tz'),
('TH', 'Thailand', 'Department of Business Development', 'https://www.dbd.go.th'),
('TL', 'Timor-Leste', 'SERVE', 'https://serve.gov.tl'),
('TG', 'Togo', 'CFE Togo', 'https://www.cfetogo.tg'),
('TO', 'Tonga', 'Business Registry', 'https://www.businessregistries.gov.to'),
('TT', 'Trinidad & Tobago', 'Companies Registry', 'https://www.agla.gov.tt'),
('TN', 'Tunisia', 'RNE', 'https://www.registre-entreprises.tn'),
('TR', 'Turkey', 'MERSIS', 'https://mersis.gtb.gov.tr'),
('TM', 'Turkmenistan', 'Ministry of Finance & Economy', NULL),
('TV', 'Tuvalu', 'Ministry of Finance', NULL),

-- U
('UG', 'Uganda', 'URSB', 'https://ursb.go.ug'),
('UA', 'Ukraine', 'Unified State Register', 'https://usr.minjust.gov.ua'),
('AE', 'United Arab Emirates', 'Ministry of Economy', 'https://www.moec.gov.ae'),
('GB', 'United Kingdom', 'Companies House', 'https://www.gov.uk/companieshouse'),
('US', 'United States', 'State Business Registries (SOS offices)', 'https://www.usa.gov/state-business'),
('UY', 'Uruguay', 'BPS / Companies Registry', 'https://www.dgi.gub.uy'),
('UZ', 'Uzbekistan', 'Single Window Portal', 'https://my.gov.uz'),

-- V
('VU', 'Vanuatu', 'VFSC', 'https://www.vfsc.vu'),
('VE', 'Venezuela', 'SENIAT (RIF)', 'https://www.seniat.gob.ve'),
('VN', 'Vietnam', 'National Business Registration Portal', 'https://dangkykinhdoanh.gov.vn'),

-- Y
('YE', 'Yemen', 'Ministry of Industry', NULL),

-- Z
('ZM', 'Zambia', 'PACRA', 'https://www.pacra.org.zm'),
('ZW', 'Zimbabwe', 'Companies Registry', 'https://www.dcip.gov.zw')

ON CONFLICT (country_code) DO UPDATE SET
  country_name = EXCLUDED.country_name,
  authority_name = EXCLUDED.authority_name,
  authority_website = EXCLUDED.authority_website;

-- ============================================================
-- FILE: 20260606_microfinance.sql
-- ============================================================

-- ============================================================
-- MICROFINANCE INSTITUTIONS
-- Run this in the Supabase SQL Editor.
-- Provides a directory of microfinance institutions that users
-- can browse and contact (phone / WhatsApp / email / website),
-- plus the list of documents each institution requires.
-- ============================================================

-- ---------- Table ----------
CREATE TABLE IF NOT EXISTS public.microfinance_institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  address TEXT,
  country TEXT NOT NULL DEFAULT 'Zambia',
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,
  min_loan NUMERIC(14,2),
  max_loan NUMERIC(14,2),
  interest_rate_min NUMERIC(6,2),
  interest_rate_max NUMERIC(6,2),
  -- Documents a user must provide, e.g. {"NRC","Proof of Residence","Salary Slip","Bank Statement"}
  required_documents TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfi_country ON public.microfinance_institutions(country);
CREATE INDEX IF NOT EXISTS idx_mfi_active ON public.microfinance_institutions(is_active);

GRANT SELECT ON public.microfinance_institutions TO anon, authenticated;
GRANT ALL ON public.microfinance_institutions TO service_role;

ALTER TABLE public.microfinance_institutions ENABLE ROW LEVEL SECURITY;

-- Anyone can read active institutions
DROP POLICY IF EXISTS "mfi_read_all" ON public.microfinance_institutions;
CREATE POLICY "mfi_read_all" ON public.microfinance_institutions
  FOR SELECT TO anon, authenticated USING (true);

-- Only admins can create/update/delete
DROP POLICY IF EXISTS "mfi_admin_write" ON public.microfinance_institutions;
CREATE POLICY "mfi_admin_write" ON public.microfinance_institutions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mfi_touch ON public.microfinance_institutions;
CREATE TRIGGER trg_mfi_touch
  BEFORE UPDATE ON public.microfinance_institutions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- Storage buckets ----------
-- Public bucket for institution logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('microfinance-logos', 'microfinance-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Private bucket for user-uploaded application documents (NRC, payslip, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('loan-documents', 'loan-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Logos: public read, admin write
DROP POLICY IF EXISTS "mfi_logo_read" ON storage.objects;
CREATE POLICY "mfi_logo_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'microfinance-logos');

DROP POLICY IF EXISTS "mfi_logo_write" ON storage.objects;
CREATE POLICY "mfi_logo_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'microfinance-logos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "mfi_logo_update" ON storage.objects;
CREATE POLICY "mfi_logo_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'microfinance-logos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "mfi_logo_delete" ON storage.objects;
CREATE POLICY "mfi_logo_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'microfinance-logos' AND public.has_role(auth.uid(), 'admin'));

-- Loan documents: a user can only read/write files inside a folder named after their own user id
-- Path convention: loan-documents/<auth.uid()>/<institution_id>/<filename>
DROP POLICY IF EXISTS "loan_docs_owner_read" ON storage.objects;
CREATE POLICY "loan_docs_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'loan-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "loan_docs_owner_write" ON storage.objects;
CREATE POLICY "loan_docs_owner_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'loan-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "loan_docs_owner_delete" ON storage.objects;
CREATE POLICY "loan_docs_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'loan-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Optional: seed a couple of Zambian microfinance institutions ----------
INSERT INTO public.microfinance_institutions
  (name, description, address, country, phone, whatsapp, email, website, min_loan, max_loan, interest_rate_min, interest_rate_max, required_documents)
VALUES
  ('Bayport Financial Services', 'Personal and payroll loans for employed individuals.', 'Bayport House, Lusaka', 'Zambia', '+260 211 123456', '+260977000000', 'info@bayport.co.zm', 'https://www.bayport.co.zm', 1000, 200000, 25, 45, ARRAY['NRC','Proof of Residence','Salary Slip','Bank Statement']),
  ('Izwe Loans Zambia', 'Affordable personal loans with flexible repayment.', 'Cairo Road, Lusaka', 'Zambia', '+260 211 654321', '+260966000000', 'info@izwe.co.zm', 'https://www.izwe.co.zm', 500, 150000, 28, 48, ARRAY['NRC','Salary Slip','Bank Statement'])
ON CONFLICT DO NOTHING;
