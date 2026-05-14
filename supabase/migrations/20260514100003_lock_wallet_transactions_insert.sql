-- ── Lock wallet_transactions INSERT to service_role only (H3) ───────────────
-- The original RLS policy from 20251115192046 used WITH CHECK (true), letting
-- any authenticated user insert arbitrary rows into the wallet ledger — even
-- rows belonging to other users. The companion GRANT in 20260512000001 made
-- this writable at the table-privilege level too.
--
-- No client/frontend code legitimately inserts into wallet_transactions.
-- All real writers are either:
--   • edge functions using SUPABASE_SERVICE_ROLE_KEY (confirm-wallet-payment,
--     verify-wallet-payment, process-refund), or
--   • SECURITY DEFINER RPCs (send_paid_message, spend_wallet_balance, the
--     subscription renewal RPCs).
-- Both keep INSERT after this change: service_role has BYPASSRLS and retains
-- its grant; SECURITY DEFINER functions run as postgres which has BYPASSRLS.
--
-- Mirrors the hardening already applied to public.transactions in
-- 20251213142155.

DROP POLICY IF EXISTS "System can insert wallet transactions" ON public.wallet_transactions;

CREATE POLICY "Only service role can insert wallet transactions"
  ON public.wallet_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Revoke the table-level GRANT added in 20260512000001. The policy above is
-- the authoritative gate now; removing the grant means even a future broken
-- policy cannot accidentally re-open this to authenticated users.
REVOKE INSERT ON public.wallet_transactions FROM authenticated;
REVOKE INSERT ON public.wallet_transactions FROM anon;
