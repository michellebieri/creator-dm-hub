-- ============================================================
-- Fix 1: Make the unlockables storage bucket public.
-- The bucket was created with public=false but all code uses
-- getPublicUrl() which only works on public buckets. Private buckets
-- require signed URLs. Since media_url values are stored in the DB
-- (which is RLS-protected) and only revealed after purchase, making
-- the bucket public is the correct design for a creator platform.
-- ============================================================
UPDATE storage.buckets SET public = true WHERE id = 'unlockables';

-- ============================================================
-- Fix 2 & 3: Atomic unlock_content RPC.
-- Replaces the 3-step client-side flow (SELECT unlocked_by → spend
-- wallet → UPDATE unlocked_by) which had two bugs:
--   a) Wallet was debited before checking if already unlocked
--   b) If the unlocked_by UPDATE failed, the wallet deduction was
--      not rolled back — user lost money but content stayed locked.
-- A single SQL function runs everything in one transaction so any
-- failure automatically rolls back the wallet deduction.
-- ============================================================
CREATE OR REPLACE FUNCTION public.unlock_content(
  p_unlockable_id UUID,
  p_creator_id    UUID,
  p_price         NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID;
  v_balance       NUMERIC;
  v_unlocked_by   UUID[];
  v_new_balance   NUMERIC;
  v_platform_fee  NUMERIC;
  v_net_amount    NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Fetch current unlocked_by with row lock to prevent race conditions
  SELECT unlocked_by INTO v_unlocked_by
  FROM unlockables
  WHERE id = p_unlockable_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Content not found');
  END IF;

  -- Already unlocked — return success without charging again
  IF v_unlocked_by IS NOT NULL AND v_user_id = ANY(v_unlocked_by) THEN
    RETURN jsonb_build_object('success', true, 'already_unlocked', true);
  END IF;

  -- Lock wallet row and check balance
  SELECT wallet_balance INTO v_balance
  FROM profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  IF v_balance < p_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance',
      'balance', v_balance, 'required', p_price);
  END IF;

  -- Deduct wallet
  v_new_balance := v_balance - p_price;
  UPDATE profiles SET wallet_balance = v_new_balance WHERE id = v_user_id;

  -- Record wallet debit
  INSERT INTO wallet_transactions (user_id, amount, transaction_type, description, related_user_id, balance_after)
  VALUES (v_user_id, -p_price, 'unlockable', 'Unlocked content', p_creator_id, v_new_balance);

  -- Add user to unlocked_by
  UPDATE unlockables
  SET unlocked_by = array_append(COALESCE(unlocked_by, '{}'::uuid[]), v_user_id)
  WHERE id = p_unlockable_id;

  -- Record creator earnings
  v_platform_fee := ROUND(p_price * 0.25, 2);
  v_net_amount   := p_price - v_platform_fee;

  INSERT INTO transactions (creator_id, customer_id, amount, transaction_type, platform_fee, net_amount, processor_fee, status)
  VALUES (p_creator_id, v_user_id, p_price, 'unlockable', v_platform_fee, v_net_amount, 0, 'completed');

  INSERT INTO platform_fees (transaction_id, creator_id, gross_amount, platform_fee_amount, creator_net_amount, status)
  SELECT id, p_creator_id, p_price, v_platform_fee, v_net_amount, 'completed'
  FROM transactions
  WHERE creator_id = p_creator_id AND customer_id = v_user_id AND amount = p_price
  ORDER BY created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'success',       true,
    'new_balance',   v_new_balance,
    'already_unlocked', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_content TO authenticated;
