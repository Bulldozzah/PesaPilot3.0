DELETE FROM public.chart_of_accounts WHERE user_business_id IS NULL;
DELETE FROM public.account_subcategories WHERE user_business_id IS NULL;