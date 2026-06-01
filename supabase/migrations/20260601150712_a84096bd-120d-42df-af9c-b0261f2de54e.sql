
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
