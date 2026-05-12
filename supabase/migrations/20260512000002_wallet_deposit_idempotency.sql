-- Add stripe_payment_intent_id to wallet_transactions so confirm-wallet-payment
-- can check for duplicate calls (idempotency) before crediting the wallet.
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Unique partial index — only one deposit row per payment intent, per user
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_deposit_idempotency
  ON public.wallet_transactions (user_id, stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
