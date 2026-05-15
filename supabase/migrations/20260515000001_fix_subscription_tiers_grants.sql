-- ── Platform fix: restore INSERT/UPDATE/DELETE grants on subscription_tiers ──
--
-- The RLS policy "Creators can manage own subscription tiers" was always
-- in place (USING auth.uid() = creator_id), but the underlying table grant
-- was reduced to SELECT-only at some point. This caused every creator's
-- tier-create attempt to fail with PostgREST 403 / "GRANT INSERT ON
-- public.subscription_tiers TO authenticated" hint, silently. No creator
-- on the platform could create or manage tiers via the UI.
--
-- Symptoms discovered: customer's chat/profile pages correctly hid the
-- Subscribe button because tier rows could never reach the DB. The bug
-- was masked for one test account by inserting a tier row directly with
-- the service role.
--
-- Fix: restore the full SELECT/INSERT/UPDATE/DELETE grant. RLS still
-- limits each creator to managing only their own rows.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_tiers TO authenticated;

-- subscription_message_usage was already granted in 20260514120001 but
-- include defensively in case a future re-deploy drops it.
GRANT SELECT, INSERT, UPDATE ON public.subscription_message_usage TO authenticated;
