-- Fix transaction_type enum: add 'subscription' value
-- The stripe webhook was inserting 'subscription' but only 'message','pack','unlockable' existed
-- 'pack_purchase' will be corrected in the webhook to use 'pack' instead

ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'subscription';

-- Note: The stripe-webhook edge function will be updated to:
-- 1. Use 'pack' instead of 'pack_purchase' for message pack purchases
-- 2. Use 'subscription' (now valid) for subscription transactions
