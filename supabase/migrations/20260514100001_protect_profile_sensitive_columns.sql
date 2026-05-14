-- ── Lock sensitive profile columns from client-side UPDATE ───────────────────
-- Without this, the `Users can update own profile` RLS policy (auth.uid() = id)
-- allows any logged-in user to UPDATE *any* column of their own profile row —
-- including wallet_balance (= mint themselves money) and role.
--
-- Postgres column-level REVOKE is applied AT the privilege layer (before RLS).
-- SECURITY DEFINER functions (the atomic send_* / spend_wallet_balance / etc.
-- RPCs) run as the function owner (postgres) and keep the privilege.
-- The Supabase service_role used by edge functions also keeps it.
-- Only the `authenticated` and `anon` API roles lose direct UPDATE on these
-- columns. RLS policies are untouched.

REVOKE UPDATE (wallet_balance) ON public.profiles FROM authenticated;
REVOKE UPDATE (wallet_balance) ON public.profiles FROM anon;
REVOKE UPDATE (role)           ON public.profiles FROM authenticated;
REVOKE UPDATE (role)           ON public.profiles FROM anon;
