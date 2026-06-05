-- ============================================
-- Chart of Accounts Seed Function
-- Separate file for COA INSERT operations
-- Run after schema_dump.sql in Supabase
-- ============================================

--
-- Name: seed_default_coa(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.seed_default_coa(_user_id uuid, _user_business_id uuid) RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    INSERT INTO public.chart_of_accounts (user_id, user_business_id, code, name, type, subcategory, account_type, is_active) VALUES
    -- ==========================================
    -- ASSETS: Current Assets (1000-1499)
    -- ==========================================
    (_user_id, _user_business_id, '1000', 'Cash', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1010', 'Petty Cash', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1020', 'Bank - Checking Account', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1030', 'Bank - Savings Account', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1040', 'Bank - Money Market', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1100', 'Accounts Receivable', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1110', 'Allowance for Doubtful Accounts', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1200', 'Inventory (Raw Materials, WIP, Finished Goods)', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1210', 'Raw Materials', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1220', 'A/REC Trade Notes Receivable', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1230', 'A/REC Installment Receivables', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1240', 'A/REC Retainage Withheld', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1290', 'A/REC Allowance for Uncollectible Accounts', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1310', 'INV - Reserved', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1320', 'INV - Work-in-Progress', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1330', 'INV - Finished Goods', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1340', 'INV - Reserved 2', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1350', 'INV - Unbilled Cost & Fees', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1390', 'INV - Reserve for Obsolescence', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1400', 'Prepaid Expenses (Rent, Insurance)', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1410', 'PREPAID - Insurance', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1420', 'PREPAID - Real Estate Taxes', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1430', 'PREPAID - Repairs & Maintenance', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1440', 'PREPAID - Rent', 'asset', 'Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1450', 'PREPAID - Deposits', 'asset', 'Current Assets', 'Asset', true),

    -- ==========================================
    -- ASSETS: Non-Current Assets (1500-1999)
    -- ==========================================
    (_user_id, _user_business_id, '1500', 'Property, Plant & Equipment', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1510', 'PPE - Buildings', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1520', 'PPE - Machinery & Equipment', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1530', 'PPE - Vehicles', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1540', 'PPE - Computer Equipment', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1550', 'PPE - Furniture & Fixtures', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1560', 'PPE - Leasehold Improvements', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1600', 'Accumulated Depreciation & Amortization', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1610', 'ACCUM DEPR Buildings', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1620', 'ACCUM DEPR Machinery & Equipment', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1630', 'ACCUM DEPR Vehicles', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1640', 'ACCUM DEPR Computer Equipment', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1650', 'ACCUM DEPR Furniture & Fixtures', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1660', 'ACCUM DEPR Leasehold Improvements', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1700', 'Non-Current Receivables', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1710', 'NCA - Notes Receivable', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1720', 'NCA - Installment Receivables', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1730', 'NCA - Retainage Withheld', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1800', 'Intercompany Receivables', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1900', 'Other Non-Current Assets', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1910', 'Organization Costs', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1920', 'Patents & Licenses', 'asset', 'Non-Current Assets', 'Asset', true),
    (_user_id, _user_business_id, '1930', 'Intangible Assets - Capitalized Software Costs', 'asset', 'Non-Current Assets', 'Asset', true),

    -- ==========================================
    -- LIABILITIES: Current Liabilities (2000-2599)
    -- ==========================================
    (_user_id, _user_business_id, '2000', 'Accounts Payable', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2010', 'Trade Payables', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2110', 'A/P Trade', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2120', 'A/P Accrued Accounts Payable', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2130', 'A/P Retainage Withheld', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2150', 'Current Maturities of Long-Term Debt', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2160', 'Bank Notes Payable', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2170', 'Construction Loans Payable', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2200', 'Accrued Compensation & Related Items', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2210', 'Accrued - Payroll', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2220', 'Accrued - Commissions', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2230', 'Accrued - FICA', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2240', 'Accrued - Unemployment Taxes', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2250', 'Accrued - Workmen''s Comp', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2260', 'Accrued - Medical Benefits', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2270', 'Accrued - 401K Company Match', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2275', 'W/H - FICA', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2280', 'W/H - Medical Benefits', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2285', 'W/H - 401K Employee Contribution', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2300', 'Other Accrued Expenses', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2310', 'Accrued - Rent', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2320', 'Accrued - Interest', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2330', 'Accrued - Property Taxes', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2340', 'Accrued - Warranty Expense', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2500', 'Accrued Taxes', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2510', 'Accrued - Federal Income Taxes', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2520', 'Accrued - State Income Taxes', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2530', 'Accrued - Franchise Taxes', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2540', 'Deferred - FIT Current', 'liability', 'Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2550', 'Deferred - State Income Taxes', 'liability', 'Current Liabilities', 'Liability', true),

    -- ==========================================
    -- LIABILITIES: Non-Current Liabilities (2600-2999)
    -- ==========================================
    (_user_id, _user_business_id, '2600', 'Deferred Taxes', 'liability', 'Non-Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2610', 'D/T - FIT - Non Current', 'liability', 'Non-Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2620', 'D/T - SIT - Non Current', 'liability', 'Non-Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2700', 'Long-Term Debt', 'liability', 'Non-Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2710', 'LTD - Notes Payable', 'liability', 'Non-Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2720', 'LTD - Mortgages Payable', 'liability', 'Non-Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2730', 'LTD - Installment Notes Payable', 'liability', 'Non-Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2800', 'Intercompany Payables', 'liability', 'Non-Current Liabilities', 'Liability', true),
    (_user_id, _user_business_id, '2900', 'Other Non Current Liabilities', 'liability', 'Non-Current Liabilities', 'Liability', true),

    -- ==========================================
    -- EQUITY (3000-3999)
    -- ==========================================
    (_user_id, _user_business_id, '3000', 'Owner''s Equities', 'equity', 'Owner''s Equity', 'Equity', true),
    (_user_id, _user_business_id, '3100', 'Common Stock', 'equity', 'Owner''s Equity', 'Equity', true),
    (_user_id, _user_business_id, '3200', 'Preferred Stock', 'equity', 'Owner''s Equity', 'Equity', true),
    (_user_id, _user_business_id, '3300', 'Paid in Capital', 'equity', 'Owner''s Equity', 'Equity', true),
    (_user_id, _user_business_id, '3400', 'Partners Capital', 'equity', 'Owner''s Equity', 'Equity', true),
    (_user_id, _user_business_id, '3500', 'Member Contributions', 'equity', 'Owner''s Equity', 'Equity', true),
    (_user_id, _user_business_id, '3600', 'Opening Balance Equity', 'equity', 'Owner''s Equity', 'Equity', true),
    (_user_id, _user_business_id, '3900', 'Retained Earnings', 'equity', 'Retained Earnings', 'Equity', true),

    -- ==========================================
    -- REVENUE (4000-4999)
    -- ==========================================
    (_user_id, _user_business_id, '4000', 'Sales Revenue', 'income', 'Operating Revenue', 'Revenue', true),
    (_user_id, _user_business_id, '4010', 'REVENUE - PRODUCT 1', 'income', 'Operating Revenue', 'Revenue', true),
    (_user_id, _user_business_id, '4020', 'REVENUE - PRODUCT 2', 'income', 'Operating Revenue', 'Revenue', true),
    (_user_id, _user_business_id, '4030', 'REVENUE - PRODUCT 3', 'income', 'Operating Revenue', 'Revenue', true),
    (_user_id, _user_business_id, '4040', 'REVENUE - PRODUCT 4', 'income', 'Operating Revenue', 'Revenue', true),
    (_user_id, _user_business_id, '4100', 'Service Revenue', 'income', 'Operating Revenue', 'Revenue', true),
    (_user_id, _user_business_id, '4110', 'Consulting Fees', 'income', 'Operating Revenue', 'Revenue', true),
    (_user_id, _user_business_id, '4120', 'Professional Fees', 'income', 'Operating Revenue', 'Revenue', true),
    (_user_id, _user_business_id, '4130', 'Training & Workshop Revenue', 'income', 'Operating Revenue', 'Revenue', true),
    (_user_id, _user_business_id, '4140', 'Maintenance & Support Revenue', 'income', 'Operating Revenue', 'Revenue', true),
    (_user_id, _user_business_id, '4600', 'Interest Income', 'income', 'Financial Income', 'Revenue', true),
    (_user_id, _user_business_id, '4700', 'Other Income', 'income', 'Other Operating Income', 'Revenue', true),
    (_user_id, _user_business_id, '4800', 'Finance Charge Income', 'income', 'Financial Income', 'Revenue', true),
    (_user_id, _user_business_id, '4900', 'Sales Returns and Allowances', 'income', 'Contra Revenue', 'Revenue', true),
    (_user_id, _user_business_id, '4950', 'Sales Discounts', 'income', 'Contra Revenue', 'Revenue', true),

    -- ==========================================
    -- COGS (5000-5999)
    -- ==========================================
    (_user_id, _user_business_id, '5000', 'Cost of Goods Sold', 'cogs', 'Direct Costs', 'COGS', true),
    (_user_id, _user_business_id, '5010', 'COGS - PRODUCT 1', 'cogs', 'Direct Costs', 'COGS', true),
    (_user_id, _user_business_id, '5020', 'COGS - PRODUCT 2', 'cogs', 'Direct Costs', 'COGS', true),
    (_user_id, _user_business_id, '5030', 'COGS - PRODUCT 3', 'cogs', 'Direct Costs', 'COGS', true),
    (_user_id, _user_business_id, '5040', 'COGS - PRODUCT 4', 'cogs', 'Direct Costs', 'COGS', true),
    (_user_id, _user_business_id, '5700', 'Freight', 'cogs', 'Direct Costs', 'COGS', true),
    (_user_id, _user_business_id, '5800', 'Inventory Adjustments', 'cogs', 'Inventory', 'COGS', true),
    (_user_id, _user_business_id, '5900', 'Purchase Returns and Allowances', 'cogs', 'Contra COGS', 'COGS', true),
    (_user_id, _user_business_id, '5950', 'Reserved', 'cogs', 'Direct Costs', 'COGS', true),

    -- ==========================================
    -- EXPENSES (6000-7500)
    -- ==========================================
    (_user_id, _user_business_id, '6010', 'Advertising Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6050', 'Amortization Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6100', 'Auto Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6150', 'Bad Debt Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6200', 'Bank Charges', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6250', 'Cash Over and Short', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6300', 'Commission Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6350', 'Depreciation Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6400', 'Employee Benefit Program', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6550', 'Freight Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6600', 'Gifts Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6650', 'Insurance - General', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6700', 'Interest Expense', 'expense', 'Non-Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6750', 'Professional Fees', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6800', 'License Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6850', 'Income Tax Expense', 'expense', 'Non-Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6860', 'Payroll Tax Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6870', 'Maintenance Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6900', 'Meals and Entertainment', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '6950', 'Office Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '7000', 'Payroll Taxes', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '7050', 'Printing', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '7150', 'Postage', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '7200', 'Rent', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '7250', 'Repairs Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '7300', 'Salaries Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '7350', 'Supplies Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '7400', 'Taxes - FIT Expense', 'expense', 'Operating Expenses', 'Expense', true),
    (_user_id, _user_business_id, '7500', 'Utilities Expense', 'expense', 'Operating Expenses', 'Expense', true),

    -- ==========================================
    -- OTHER INCOME (7900)
    -- ==========================================
    (_user_id, _user_business_id, '7900', 'Gain/Loss on Sale of Assets', 'other_income', 'Non-Operating Income', 'Other Income', true)

    ON CONFLICT DO NOTHING;
END;
$$;


--
-- Name: auto_seed_coa_for_new_business(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_seed_coa_for_new_business() RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    PERFORM public.seed_default_coa(NEW.user_id, NEW.id);
    RETURN NEW;
END;
$$;


--
-- Trigger: Auto-seed COA when new business is created
--

DROP TRIGGER IF EXISTS trg_seed_coa_on_business_create ON public.user_businesses;

CREATE TRIGGER trg_seed_coa_on_business_create
    AFTER INSERT ON public.user_businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_seed_coa_for_new_business();


-- ============================================
-- USAGE EXAMPLES:
-- ============================================
-- 
-- Manual seed for existing business:
-- SELECT public.seed_default_coa('user-uuid-here', 'business-uuid-here');
--
-- The trigger will auto-seed when INSERT INTO user_businesses happens
-- ============================================
