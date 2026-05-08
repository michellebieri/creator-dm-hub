-- ============================================================
-- Security fixes
-- 1. Atomic subscription purchase (wallet + subscription in one tx)
-- 2. insert_completed_transaction: verify recent wallet deduction
-- ============================================================

-- 1. Atomic subscription purchase RPC
CREATE OR REPLACE FUNCTION public.purchase_subscription(
  p_tier_id       UUID,
  p_creator_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id       UUID;
  v_tier              RECORD;
  v_balance           NUMERIC;
  v_now               TIMESTAMPTZ := now();
  v_period_end        TIMESTAMPTZ;
  v_subscription_id   UUID;
  v_usage_id          UUID;
  v_platform_fee      NUMERIC;
  v_net_amount        NUMERIC;
  v_tx_id             UUID;
  v_fee_id            UUID;
BEGIN
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF v_customer_id = p_creator_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot subscribe to yourself');
  END IF;

  -- Fetch tier and verify it belongs to the creator
  SELECT * INTO v_tier FROM subscription_tiers
  WHERE id = p_tier_id AND creator_id = p_creator_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subscription tier not found');
  END IF;

  -- Check wallet balance with row lock
  SELECT wallet_balance INTO v_balance FROM profiles WHERE id = v_customer_id FOR UPDATE;
  IF v_balance < v_tier.price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Deduct wallet
  UPDATE profiles SET wallet_balance = wallet_balance - v_tier.price WHERE id = v_customer_id;

  -- Record wallet transaction
  INSERT INTO wallet_transactions (user_id, amount, transaction_type, description, related_user_id)
  VALUES (v_customer_id, -v_tier.price, 'subscription',
    'Subscription purchase', p_creator_id);

  -- Calculate period end
  v_period_end := CASE v_tier.billing_interval
    WHEN 'yearly' THEN v_now + INTERVAL '1 year'
    ELSE v_now + INTERVAL '1 month'
  END;

  -- Insert subscription
  INSERT INTO creator_subscriptions (customer_id, tier_id, status, current_period_start, current_period_end)
  VALUES (v_customer_id, p_tier_id, 'active', v_now, v_period_end)
  RETURNING id INTO v_subscription_id;

  -- Insert message usage if applicable
  IF v_tier.free_messages_per_month > 0 THEN
    INSERT INTO subscription_message_usage
      (subscription_id, customer_id, creator_id, messages_allowed, messages_used, period_start, period_end)
    VALUES
      (v_subscription_id, v_customer_id, p_creator_id, v_tier.free_messages_per_month, 0, v_now, v_period_end);
  END IF;

  -- Record platform split (25% platform, 75% creator)
  v_platform_fee := ROUND(v_tier.price * 0.25, 2);
  v_net_amount   := v_tier.price - v_platform_fee;

  INSERT INTO transactions (creator_id, customer_id, amount, transaction_type, platform_fee, net_amount, status)
  VALUES (p_creator_id, v_customer_id, v_tier.price, 'pack', v_platform_fee, v_net_amount, 'completed')
  RETURNING id INTO v_tx_id;

  INSERT INTO platform_fees (transaction_id, creator_id, gross_amount, platform_fee_amount, creator_net_amount, status)
  VALUES (v_tx_id, p_creator_id, v_tier.price, v_platform_fee, v_net_amount, 'completed')
  RETURNING id INTO v_fee_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'transaction_id', v_tx_id,
    'period_end', v_period_end
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_subscription TO authenticated;

-- 2. Harden insert_completed_transaction: require a recent wallet deduction
-- Add check: a wallet_transactions record must exist for this customer
-- within the last 3 minutes for the same amount (prevents fabrication without payment)
CREATE OR REPLACE FUNCTION public.insert_completed_transaction(
  p_creator_id       UUID,
  p_amount           NUMERIC,
  p_transaction_type TEXT,
  p_platform_fee     NUMERIC DEFAULT NULL,
  p_processor_fee    NUMERIC DEFAULT 0,
  p_net_amount       NUMERIC DEFAULT NULL,
  p_message_id       UUID    DEFAULT NULL,
  p_bundle_id        UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id  UUID;
  v_platform_fee NUMERIC;
  v_net_amount   NUMERIC;
  v_tx_id        UUID;
  v_fee_id       UUID;
  v_wallet_check BOOLEAN;
BEGIN
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF v_customer_id = p_creator_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transact with yourself');
  END IF;
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  IF p_transaction_type NOT IN ('message', 'pack', 'unlockable') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transaction_type');
  END IF;

  -- Verify a real wallet deduction happened in the last 3 minutes
  SELECT EXISTS (
    SELECT 1 FROM wallet_transactions
    WHERE user_id = v_customer_id
      AND amount = -p_amount
      AND created_at >= now() - INTERVAL '3 minutes'
  ) INTO v_wallet_check;

  IF NOT v_wallet_check THEN
    RETURN jsonb_build_object('success', false, 'error', 'No matching payment found');
  END IF;

  v_platform_fee := COALESCE(p_platform_fee, ROUND(p_amount * 0.25, 2));
  v_net_amount   := COALESCE(p_net_amount,   ROUND(p_amount - v_platform_fee, 2));

  INSERT INTO transactions (creator_id, customer_id, amount, transaction_type, platform_fee, processor_fee, net_amount, status, message_id, bundle_id)
  VALUES (p_creator_id, v_customer_id, p_amount, p_transaction_type::transaction_type, v_platform_fee, COALESCE(p_processor_fee, 0), v_net_amount, 'completed', p_message_id, p_bundle_id)
  RETURNING id INTO v_tx_id;

  INSERT INTO platform_fees (transaction_id, creator_id, gross_amount, platform_fee_amount, creator_net_amount, status)
  VALUES (v_tx_id, p_creator_id, p_amount, v_platform_fee, v_net_amount, 'completed')
  RETURNING id INTO v_fee_id;

  RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'platform_fee_id', v_fee_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_completed_transaction TO authenticated;
