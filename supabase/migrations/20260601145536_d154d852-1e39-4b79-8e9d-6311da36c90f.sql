ALTER TABLE public.user_businesses
  ADD COLUMN IF NOT EXISTS budget numeric NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS expected_monthly_profit numeric;