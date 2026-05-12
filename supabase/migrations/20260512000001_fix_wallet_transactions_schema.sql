-- ============================================================
-- Fix wallet_transactions:
-- 1. Add missing payment_method column (confirm-wallet-payment tries to insert it but col doesn't exist → silent fail → deposit never recorded)
-- 2. Add GRANT so authenticated users can insert their own records via RLS
-- ============================================================

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Ensure authenticated users can read their own transactions
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT INSERT ON public.wallet_transactions TO authenticated;
