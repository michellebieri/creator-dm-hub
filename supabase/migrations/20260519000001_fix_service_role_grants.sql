-- Fix missing SELECT grants for service_role on tables used by edge functions.
-- Root cause: permission-hardening migrations (20260514*) granted permissions to
-- 'authenticated' and 'anon' but never explicitly granted to 'service_role'.
-- In Supabase, service_role bypasses RLS but still requires GRANT-level access.
-- Without these, check-auto-reply (and any other edge function using the service
-- role client) gets "permission denied for table X" on every query.

GRANT SELECT ON public.conversations TO service_role;
GRANT SELECT ON public.creator_ai_personas TO service_role;
GRANT SELECT ON public.creator_settings TO service_role;
GRANT SELECT ON public.creator_subscriptions TO service_role;
GRANT SELECT, INSERT ON public.messages TO service_role;
GRANT SELECT ON public.subscription_message_usage TO service_role;
GRANT SELECT ON public.subscription_tiers TO service_role;
GRANT SELECT ON public.transactions TO service_role;
