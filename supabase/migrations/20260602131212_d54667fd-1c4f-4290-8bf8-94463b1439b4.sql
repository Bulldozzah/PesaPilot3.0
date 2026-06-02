
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
