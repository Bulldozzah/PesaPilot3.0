--
-- PostgreSQL database dump
--

\restrict hHSzaP7IoBiA9piU0VcV0lAiANUTjZbCj8g2wzq8K7wrYUMjKmaWVeCyt3uzdlS

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_type AS ENUM (
    'asset',
    'liability',
    'equity',
    'income',
    'expense',
    'cogs',
    'other_income',
    'other_expense'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: bank_account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bank_account_type AS ENUM (
    'checking',
    'savings',
    'mobile_money',
    'cash'
);


--
-- Name: business_difficulty; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.business_difficulty AS ENUM (
    'easy',
    'medium',
    'hard'
);


--
-- Name: contact_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.contact_type AS ENUM (
    'vendor',
    'customer'
);


--
-- Name: lender_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lender_type AS ENUM (
    'bank',
    'microfinance',
    'sacco',
    'digital',
    'government'
);


--
-- Name: personal_tx_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.personal_tx_type AS ENUM (
    'income',
    'expense'
);


--
-- Name: create_chart_account_for_bank(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_chart_account_for_bank() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
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
$_$;


--
-- Name: delete_chart_account_for_bank(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_chart_account_for_bank() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
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


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  PERFORM public.seed_default_expense_categories(NEW.id);
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;


--
-- Name: recalc_bank_account_balance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalc_bank_account_balance() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
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
         JOIN public.journal_entries je ON je.id = jl.journal_entry_id
         WHERE jl.account_id = ba.chart_account_id
           AND je.is_posted = true
       ), 0)
     WHERE ba.chart_account_id = aid;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: seed_default_expense_categories(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.seed_default_expense_categories(_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: sync_chart_account_for_bank(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_chart_account_for_bank() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
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


--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_subcategories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_subcategories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    account_type text NOT NULL,
    name text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_business_id uuid,
    name text NOT NULL,
    bank_name text,
    account_number text,
    type public.bank_account_type DEFAULT 'checking'::public.bank_account_type NOT NULL,
    currency text DEFAULT 'KES'::text,
    balance numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    account_code text,
    chart_account_id uuid,
    current_balance numeric DEFAULT 0 NOT NULL
);


--
-- Name: business_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    icon text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    emoji text
);


--
-- Name: business_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_business_id uuid,
    title text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_template_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_template_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    step_number integer NOT NULL,
    title text NOT NULL,
    description text,
    est_days integer DEFAULT 1
);


--
-- Name: business_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    startup_cost_min numeric(14,2) DEFAULT 0,
    startup_cost_max numeric(14,2) DEFAULT 0,
    monthly_profit_min numeric(14,2) DEFAULT 0,
    monthly_profit_max numeric(14,2) DEFAULT 0,
    difficulty public.business_difficulty DEFAULT 'medium'::public.business_difficulty,
    time_to_profit_months integer DEFAULT 3,
    currency text DEFAULT 'KES'::text,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    overview_content text,
    overview_video_url text,
    overview_web_url text,
    overview_pdf_url text
);


--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chart_of_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_business_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    type public.account_type NOT NULL,
    is_personal boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    subcategory text,
    account_type text
);


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_business_id uuid,
    type public.contact_type NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: country_authorities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.country_authorities (
    id bigint NOT NULL,
    country_code character(2) NOT NULL,
    country_name text NOT NULL,
    authority_name text NOT NULL,
    authority_website text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: country_authorities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.country_authorities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: country_authorities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.country_authorities_id_seq OWNED BY public.country_authorities.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    customer_name text NOT NULL,
    email text,
    phone text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_business_id uuid,
    entry_date date DEFAULT CURRENT_DATE NOT NULL,
    reference text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_posted boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: journal_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    journal_entry_id uuid NOT NULL,
    account_id uuid NOT NULL,
    debit numeric(14,2) DEFAULT 0 NOT NULL,
    credit numeric(14,2) DEFAULT 0 NOT NULL,
    description text,
    vendor_id uuid,
    customer_id uuid,
    transaction_type text,
    tax_amount numeric DEFAULT 0 NOT NULL,
    memo text,
    CONSTRAINT journal_lines_check CHECK (((debit >= (0)::numeric) AND (credit >= (0)::numeric))),
    CONSTRAINT journal_lines_check1 CHECK ((NOT ((debit > (0)::numeric) AND (credit > (0)::numeric))))
);


--
-- Name: lenders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lenders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    country text DEFAULT 'Kenya'::text NOT NULL,
    type public.lender_type DEFAULT 'bank'::public.lender_type NOT NULL,
    description text,
    min_loan numeric(14,2),
    max_loan numeric(14,2),
    interest_rate_min numeric(6,2),
    interest_rate_max numeric(6,2),
    requirements text,
    website text,
    logo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: personal_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    limit_amount numeric NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT personal_budgets_month_check CHECK (((month >= 1) AND (month <= 12)))
);


--
-- Name: personal_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    amount numeric NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: personal_income; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_income (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    source text NOT NULL,
    amount numeric NOT NULL,
    frequency text NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT personal_income_frequency_check CHECK ((frequency = ANY (ARRAY['Monthly'::text, 'Weekly'::text, 'Yearly'::text, 'One-time'::text]))),
    CONSTRAINT personal_income_month_check CHECK (((month >= 1) AND (month <= 12)))
);


--
-- Name: personal_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type public.personal_tx_type NOT NULL,
    amount numeric(14,2) NOT NULL,
    category text NOT NULL,
    description text,
    transaction_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    country text DEFAULT 'Kenya'::text,
    currency text DEFAULT 'KES'::text,
    phone text,
    business_name text,
    avatar_url text,
    completed_onboarding boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    country_code text
);


--
-- Name: regulatory_authorities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulatory_authorities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country text NOT NULL,
    name text NOT NULL,
    description text,
    website text,
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: savings_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.savings_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    target_amount numeric(14,2) NOT NULL,
    current_amount numeric(14,2) DEFAULT 0 NOT NULL,
    target_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    month integer,
    year integer,
    deadline date,
    CONSTRAINT savings_goals_month_check CHECK (((month >= 1) AND (month <= 12)))
);


--
-- Name: step_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.step_progress (
    id bigint NOT NULL,
    user_business_id uuid NOT NULL,
    step_number integer NOT NULL,
    step_title text,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    notes text,
    checklist_status jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: step_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.step_progress_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: step_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.step_progress_id_seq OWNED BY public.step_progress.id;


--
-- Name: user_businesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_businesses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template_id uuid,
    name text NOT NULL,
    description text,
    currency text DEFAULT 'KES'::text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    budget numeric DEFAULT 10000 NOT NULL,
    start_date date,
    expected_monthly_profit numeric
);


--
-- Name: user_roadmap_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roadmap_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_business_id uuid NOT NULL,
    step_id uuid NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    notes text
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    vendor_name text NOT NULL,
    email text,
    phone text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wallet_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    amount_planned numeric(14,2) NOT NULL,
    month date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: country_authorities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_authorities ALTER COLUMN id SET DEFAULT nextval('public.country_authorities_id_seq'::regclass);


--
-- Name: step_progress id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_progress ALTER COLUMN id SET DEFAULT nextval('public.step_progress_id_seq'::regclass);


--
-- Name: account_subcategories account_subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_subcategories
    ADD CONSTRAINT account_subcategories_pkey PRIMARY KEY (id);


--
-- Name: account_subcategories account_subcategories_user_business_id_account_type_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_subcategories
    ADD CONSTRAINT account_subcategories_user_business_id_account_type_name_key UNIQUE (user_business_id, account_type, name);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: business_categories business_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_name_key UNIQUE (name);


--
-- Name: business_categories business_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_pkey PRIMARY KEY (id);


--
-- Name: business_categories business_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_slug_key UNIQUE (slug);


--
-- Name: business_plans business_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_plans
    ADD CONSTRAINT business_plans_pkey PRIMARY KEY (id);


--
-- Name: business_template_steps business_template_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_template_steps
    ADD CONSTRAINT business_template_steps_pkey PRIMARY KEY (id);


--
-- Name: business_template_steps business_template_steps_template_id_step_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_template_steps
    ADD CONSTRAINT business_template_steps_template_id_step_number_key UNIQUE (template_id, step_number);


--
-- Name: business_templates business_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_templates
    ADD CONSTRAINT business_templates_pkey PRIMARY KEY (id);


--
-- Name: business_templates business_templates_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_templates
    ADD CONSTRAINT business_templates_slug_key UNIQUE (slug);


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: country_authorities country_authorities_country_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_authorities
    ADD CONSTRAINT country_authorities_country_code_key UNIQUE (country_code);


--
-- Name: country_authorities country_authorities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_authorities
    ADD CONSTRAINT country_authorities_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_user_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_user_id_name_key UNIQUE (user_id, name);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: journal_lines journal_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_pkey PRIMARY KEY (id);


--
-- Name: lenders lenders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lenders
    ADD CONSTRAINT lenders_pkey PRIMARY KEY (id);


--
-- Name: personal_budgets personal_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_budgets
    ADD CONSTRAINT personal_budgets_pkey PRIMARY KEY (id);


--
-- Name: personal_budgets personal_budgets_user_id_category_month_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_budgets
    ADD CONSTRAINT personal_budgets_user_id_category_month_year_key UNIQUE (user_id, category, month, year);


--
-- Name: personal_expenses personal_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_expenses
    ADD CONSTRAINT personal_expenses_pkey PRIMARY KEY (id);


--
-- Name: personal_income personal_income_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_income
    ADD CONSTRAINT personal_income_pkey PRIMARY KEY (id);


--
-- Name: personal_transactions personal_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_transactions
    ADD CONSTRAINT personal_transactions_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: regulatory_authorities regulatory_authorities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulatory_authorities
    ADD CONSTRAINT regulatory_authorities_pkey PRIMARY KEY (id);


--
-- Name: savings_goals savings_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.savings_goals
    ADD CONSTRAINT savings_goals_pkey PRIMARY KEY (id);


--
-- Name: step_progress step_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_progress
    ADD CONSTRAINT step_progress_pkey PRIMARY KEY (id);


--
-- Name: step_progress step_progress_user_business_id_step_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_progress
    ADD CONSTRAINT step_progress_user_business_id_step_number_key UNIQUE (user_business_id, step_number);


--
-- Name: user_businesses user_businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_businesses
    ADD CONSTRAINT user_businesses_pkey PRIMARY KEY (id);


--
-- Name: user_roadmap_progress user_roadmap_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roadmap_progress
    ADD CONSTRAINT user_roadmap_progress_pkey PRIMARY KEY (id);


--
-- Name: user_roadmap_progress user_roadmap_progress_user_business_id_step_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roadmap_progress
    ADD CONSTRAINT user_roadmap_progress_user_business_id_step_id_key UNIQUE (user_business_id, step_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: wallet_budgets wallet_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_budgets
    ADD CONSTRAINT wallet_budgets_pkey PRIMARY KEY (id);


--
-- Name: wallet_budgets wallet_budgets_user_id_category_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_budgets
    ADD CONSTRAINT wallet_budgets_user_id_category_month_key UNIQUE (user_id, category, month);


--
-- Name: business_plans bp_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER bp_touch BEFORE UPDATE ON public.business_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: journal_entries journal_entries_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER journal_entries_touch BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: profiles profiles_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: bank_accounts trg_create_chart_account_for_bank; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_create_chart_account_for_bank BEFORE INSERT ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.create_chart_account_for_bank();


--
-- Name: bank_accounts trg_delete_chart_account_for_bank; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_delete_chart_account_for_bank BEFORE DELETE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.delete_chart_account_for_bank();


--
-- Name: journal_lines trg_recalc_bank_balance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recalc_bank_balance AFTER INSERT OR DELETE OR UPDATE ON public.journal_lines FOR EACH ROW EXECUTE FUNCTION public.recalc_bank_account_balance();


--
-- Name: step_progress trg_step_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_step_progress_updated_at BEFORE UPDATE ON public.step_progress FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: bank_accounts trg_sync_chart_account_for_bank; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_chart_account_for_bank AFTER UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.sync_chart_account_for_bank();


--
-- Name: bank_accounts bank_accounts_user_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_user_business_id_fkey FOREIGN KEY (user_business_id) REFERENCES public.user_businesses(id) ON DELETE SET NULL;


--
-- Name: bank_accounts bank_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: business_plans business_plans_user_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_plans
    ADD CONSTRAINT business_plans_user_business_id_fkey FOREIGN KEY (user_business_id) REFERENCES public.user_businesses(id) ON DELETE CASCADE;


--
-- Name: business_plans business_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_plans
    ADD CONSTRAINT business_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: business_template_steps business_template_steps_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_template_steps
    ADD CONSTRAINT business_template_steps_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.business_templates(id) ON DELETE CASCADE;


--
-- Name: business_templates business_templates_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_templates
    ADD CONSTRAINT business_templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.business_categories(id) ON DELETE SET NULL;


--
-- Name: chart_of_accounts chart_of_accounts_user_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_user_business_id_fkey FOREIGN KEY (user_business_id) REFERENCES public.user_businesses(id) ON DELETE CASCADE;


--
-- Name: chart_of_accounts chart_of_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_user_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_user_business_id_fkey FOREIGN KEY (user_business_id) REFERENCES public.user_businesses(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: journal_entries journal_entries_user_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_user_business_id_fkey FOREIGN KEY (user_business_id) REFERENCES public.user_businesses(id) ON DELETE CASCADE;


--
-- Name: journal_entries journal_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: journal_lines journal_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT;


--
-- Name: journal_lines journal_lines_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE CASCADE;


--
-- Name: personal_transactions personal_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_transactions
    ADD CONSTRAINT personal_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: savings_goals savings_goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.savings_goals
    ADD CONSTRAINT savings_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: step_progress step_progress_user_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_progress
    ADD CONSTRAINT step_progress_user_business_id_fkey FOREIGN KEY (user_business_id) REFERENCES public.user_businesses(id) ON DELETE CASCADE;


--
-- Name: user_businesses user_businesses_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_businesses
    ADD CONSTRAINT user_businesses_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.business_templates(id) ON DELETE SET NULL;


--
-- Name: user_businesses user_businesses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_businesses
    ADD CONSTRAINT user_businesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roadmap_progress user_roadmap_progress_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roadmap_progress
    ADD CONSTRAINT user_roadmap_progress_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.business_template_steps(id) ON DELETE CASCADE;


--
-- Name: user_roadmap_progress user_roadmap_progress_user_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roadmap_progress
    ADD CONSTRAINT user_roadmap_progress_user_business_id_fkey FOREIGN KEY (user_business_id) REFERENCES public.user_businesses(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallet_budgets wallet_budgets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_budgets
    ADD CONSTRAINT wallet_budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: account_subcategories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_subcategories ENABLE ROW LEVEL SECURITY;

--
-- Name: account_subcategories asc_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY asc_own ON public.account_subcategories TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: bank_accounts ba_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ba_own ON public.bank_accounts TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: bank_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: business_plans bp_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bp_own ON public.business_plans TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: business_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: business_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: business_template_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_template_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: business_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: business_categories cat_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cat_admin_write ON public.business_categories TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: business_categories cat_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cat_read_all ON public.business_categories FOR SELECT TO authenticated, anon USING (true);


--
-- Name: chart_of_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: chart_of_accounts coa_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coa_own ON public.chart_of_accounts TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: country_authorities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.country_authorities ENABLE ROW LEVEL SECURITY;

--
-- Name: country_authorities country_authorities_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY country_authorities_admin_write ON public.country_authorities TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: country_authorities country_authorities_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY country_authorities_read_all ON public.country_authorities FOR SELECT TO authenticated, anon USING (true);


--
-- Name: contacts ct_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ct_own ON public.contacts TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: customers customers_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customers_own ON public.customers TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: expense_categories ec_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ec_delete ON public.expense_categories FOR DELETE TO authenticated USING (((auth.uid() = user_id) AND (is_default = false)));


--
-- Name: expense_categories ec_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ec_insert ON public.expense_categories FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: expense_categories ec_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ec_select ON public.expense_categories FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: expense_categories ec_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ec_update ON public.expense_categories FOR UPDATE TO authenticated USING (((auth.uid() = user_id) AND (is_default = false))) WITH CHECK (((auth.uid() = user_id) AND (is_default = false)));


--
-- Name: expense_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: journal_entries je_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY je_own ON public.journal_entries TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: journal_lines jl_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY jl_own ON public.journal_lines TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.journal_entries je
  WHERE ((je.id = journal_lines.journal_entry_id) AND (je.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.journal_entries je
  WHERE ((je.id = journal_lines.journal_entry_id) AND (je.user_id = auth.uid())))));


--
-- Name: journal_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: journal_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: lenders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lenders ENABLE ROW LEVEL SECURITY;

--
-- Name: lenders ln_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ln_admin_write ON public.lenders TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lenders ln_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ln_read_all ON public.lenders FOR SELECT TO authenticated, anon USING (true);


--
-- Name: personal_budgets pb_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pb_own ON public.personal_budgets TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: personal_expenses pe_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pe_own ON public.personal_expenses TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: personal_budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.personal_budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: personal_expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.personal_expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: personal_income; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.personal_income ENABLE ROW LEVEL SECURITY;

--
-- Name: personal_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.personal_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: personal_income pi_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pi_own ON public.personal_income TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: personal_transactions pt_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pt_own ON public.personal_transactions TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: regulatory_authorities ra_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ra_admin_write ON public.regulatory_authorities TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: regulatory_authorities ra_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ra_read_all ON public.regulatory_authorities FOR SELECT TO authenticated, anon USING (true);


--
-- Name: regulatory_authorities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.regulatory_authorities ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roadmap_progress rp_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rp_own ON public.user_roadmap_progress TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_businesses ub
  WHERE ((ub.id = user_roadmap_progress.user_business_id) AND (ub.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_businesses ub
  WHERE ((ub.id = user_roadmap_progress.user_business_id) AND (ub.user_id = auth.uid())))));


--
-- Name: savings_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: savings_goals sg_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sg_own ON public.savings_goals TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: step_progress sp_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sp_own ON public.step_progress TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_businesses ub
  WHERE ((ub.id = step_progress.user_business_id) AND (ub.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_businesses ub
  WHERE ((ub.id = step_progress.user_business_id) AND (ub.user_id = auth.uid())))));


--
-- Name: step_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.step_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: business_templates tpl_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tpl_admin_write ON public.business_templates TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: business_templates tpl_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tpl_read_all ON public.business_templates FOR SELECT TO authenticated, anon USING (true);


--
-- Name: business_template_steps tplstep_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tplstep_admin_write ON public.business_template_steps TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: business_template_steps tplstep_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tplstep_read_all ON public.business_template_steps FOR SELECT TO authenticated, anon USING (true);


--
-- Name: user_businesses ub_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ub_own ON public.user_businesses TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_businesses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_businesses ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roadmap_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roadmap_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles user_roles_no_user_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_no_user_delete ON public.user_roles FOR DELETE TO authenticated, anon USING (false);


--
-- Name: user_roles user_roles_no_user_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_no_user_insert ON public.user_roles FOR INSERT TO authenticated, anon WITH CHECK (false);


--
-- Name: user_roles user_roles_no_user_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_no_user_update ON public.user_roles FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);


--
-- Name: user_roles user_roles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: vendors vendors_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendors_own ON public.vendors TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: wallet_budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_budgets wb_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wb_own ON public.wallet_budgets TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- PostgreSQL database dump complete
--

\unrestrict hHSzaP7IoBiA9piU0VcV0lAiANUTjZbCj8g2wzq8K7wrYUMjKmaWVeCyt3uzdlS

