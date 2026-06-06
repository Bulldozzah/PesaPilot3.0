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
