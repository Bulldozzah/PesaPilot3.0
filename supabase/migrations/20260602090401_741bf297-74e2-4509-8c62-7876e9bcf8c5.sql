ALTER FUNCTION public.create_chart_account_for_bank() SECURITY INVOKER;
ALTER FUNCTION public.sync_chart_account_for_bank() SECURITY INVOKER;
ALTER FUNCTION public.delete_chart_account_for_bank() SECURITY INVOKER;
ALTER FUNCTION public.recalc_bank_account_balance() SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.create_chart_account_for_bank() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_chart_account_for_bank() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_chart_account_for_bank() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_bank_account_balance() FROM PUBLIC, anon, authenticated;