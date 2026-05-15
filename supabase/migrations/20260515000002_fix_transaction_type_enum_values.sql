-- ── Platform fix: complete transaction_type enum ──
--
-- The transaction_type enum was created with only ('message','pack','unlockable').
-- Migration 20260513000000 tried to add 'subscription' but never landed in
-- production (handoff doc claimed it was applied — it wasn't, same as the
-- unlock_content situation discovered yesterday).
--
-- Code references these values that are not in the enum:
--   'subscription'  — purchase_subscription RPC, renewal cron, stripe-webhook
--   'deposit'       — verify-wallet-payment, confirm-wallet-payment
--   'refund'        — process-refund edge function
--
-- Symptoms discovered by the subscription-lifecycle E2E:
--   400 /rest/v1/rpc/purchase_subscription :: 22P02 invalid input value
--   for enum transaction_type: "subscription"
--
-- Without these enum values:
--   • No customer can subscribe (purchase_subscription crashes)
--   • Cron renewal silently fails (transactions row insert raises)
--   • Wallet deposits via Stripe webhook fail mid-flow
--   • Refunds cannot be issued
--
-- Fix: add all three missing enum values. ADD VALUE IF NOT EXISTS is
-- idempotent and safe to re-run.

ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'subscription';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'deposit';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'refund';
