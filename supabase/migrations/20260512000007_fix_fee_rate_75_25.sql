-- Fix fee split to 25% platform / 75% creator across all wallet payment paths.
-- Supersedes the 15/85 rates set in migrations 20260512000004 and 20260512000005.

-- ── purchase_subscription RPC ─────────────────────────────────────────────────
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

  -- Record wallet debit
  INSERT INTO wallet_transactions (user_id, amount, transaction_type, description, related_user_id)
  VALUES (v_customer_id, -v_tier.price, 'subscription', 'Subscription purchase', p_creator_id);

  -- Calculate period end
  v_period_end := CASE v_tier.billing_interval
    WHEN 'yearly' THEN v_now + INTERVAL '1 year'
    ELSE v_now + INTERVAL '1 month'
  END;

  -- Insert subscription
  INSERT INTO creator_subscriptions (customer_id, creator_id, tier_id, status, current_period_start, current_period_end)
  VALUES (v_customer_id, p_creator_id, p_tier_id, 'active', v_now, v_period_end)
  RETURNING id INTO v_subscription_id;

  -- Insert message usage if applicable
  IF COALESCE(v_tier.free_messages_per_month, 0) > 0 THEN
    INSERT INTO subscription_message_usage
      (subscription_id, customer_id, creator_id, messages_allowed, messages_used, period_start, period_end)
    VALUES
      (v_subscription_id, v_customer_id, p_creator_id, v_tier.free_messages_per_month, 0, v_now, v_period_end);
  END IF;

  -- 25% platform / 75% creator
  v_platform_fee := ROUND(v_tier.price * 0.25, 2);
  v_net_amount   := v_tier.price - v_platform_fee;

  INSERT INTO transactions (creator_id, customer_id, amount, transaction_type, platform_fee, net_amount, processor_fee, status)
  VALUES (p_creator_id, v_customer_id, v_tier.price, 'subscription', v_platform_fee, v_net_amount, 0, 'completed')
  RETURNING id INTO v_tx_id;

  INSERT INTO platform_fees (transaction_id, creator_id, gross_amount, platform_fee_amount, creator_net_amount, status)
  VALUES (v_tx_id, p_creator_id, v_tier.price, v_platform_fee, v_net_amount, 'completed')
  RETURNING id INTO v_fee_id;

  RETURN jsonb_build_object(
    'success',         true,
    'subscription_id', v_subscription_id,
    'transaction_id',  v_tx_id,
    'period_end',      v_period_end
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_subscription TO authenticated;


-- ── process_all_subscription_renewals (cron) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_all_subscription_renewals()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub             RECORD;
  v_balance         NUMERIC;
  v_now             TIMESTAMPTZ := now();
  v_new_period_end  TIMESTAMPTZ;
  v_platform_fee    NUMERIC;
  v_net_amount      NUMERIC;
  v_tx_id           UUID;
  v_renewed         INT := 0;
  v_failed          INT := 0;
BEGIN
  -- Process each expired wallet-only active subscription
  FOR v_sub IN
    SELECT
      cs.id,
      cs.customer_id,
      cs.creator_id,
      cs.tier_id,
      cs.current_period_end,
      st.price,
      st.billing_interval,
      st.free_messages_per_month,
      st.name AS tier_name
    FROM creator_subscriptions cs
    JOIN subscription_tiers st ON st.id = cs.tier_id
    WHERE cs.status = 'active'
      AND cs.current_period_end <= v_now
      AND cs.stripe_subscription_id IS NULL   -- wallet-only subscriptions
    FOR UPDATE OF cs
  LOOP
    -- Lock customer profile for balance check
    SELECT wallet_balance INTO v_balance FROM profiles WHERE id = v_sub.customer_id FOR UPDATE;

    IF v_balance >= v_sub.price THEN
      -- Deduct wallet
      UPDATE profiles SET wallet_balance = wallet_balance - v_sub.price WHERE id = v_sub.customer_id;

      -- 25% platform / 75% creator
      v_platform_fee := ROUND(v_sub.price * 0.25, 2);
      v_net_amount   := v_sub.price - v_platform_fee;

      -- Extend subscription period
      v_new_period_end := CASE v_sub.billing_interval
        WHEN 'yearly' THEN v_sub.current_period_end + INTERVAL '1 year'
        ELSE v_sub.current_period_end + INTERVAL '1 month'
      END;

      UPDATE creator_subscriptions
      SET current_period_start = v_sub.current_period_end,
          current_period_end   = v_new_period_end,
          updated_at           = v_now
      WHERE id = v_sub.id;

      -- Record transaction
      INSERT INTO transactions (creator_id, customer_id, amount, transaction_type, platform_fee, net_amount, processor_fee, status)
      VALUES (v_sub.creator_id, v_sub.customer_id, v_sub.price, 'subscription', v_platform_fee, v_net_amount, 0, 'completed')
      RETURNING id INTO v_tx_id;

      INSERT INTO platform_fees (transaction_id, creator_id, gross_amount, platform_fee_amount, creator_net_amount, status)
      VALUES (v_tx_id, v_sub.creator_id, v_sub.price, v_platform_fee, v_net_amount, 'completed');

      -- Record wallet debit
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, description, related_user_id)
      VALUES (v_sub.customer_id, -v_sub.price, 'subscription', 'Subscription renewal: ' || v_sub.tier_name, v_sub.creator_id);

      -- Refresh message usage for new period (if applicable)
      IF COALESCE(v_sub.free_messages_per_month, 0) > 0 THEN
        UPDATE subscription_message_usage
        SET messages_used  = 0,
            period_start   = v_sub.current_period_end,
            period_end     = v_new_period_end,
            updated_at     = v_now
        WHERE subscription_id = v_sub.id;
      END IF;

      -- Notify customer
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (v_sub.customer_id, 'Subscription Renewed',
              'Your subscription has been renewed for ' || v_sub.tier_name, 'payment');

      v_renewed := v_renewed + 1;

    ELSE
      -- Insufficient balance — cancel subscription
      UPDATE creator_subscriptions SET status = 'cancelled', updated_at = v_now WHERE id = v_sub.id;

      INSERT INTO notifications (user_id, title, message, type)
      VALUES (v_sub.customer_id, 'Subscription Cancelled',
              'Your subscription to ' || v_sub.tier_name || ' was cancelled due to insufficient wallet balance.', 'payment');

      v_failed := v_failed + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('renewed', v_renewed, 'failed', v_failed);
END;
$$;

REVOKE ALL ON FUNCTION public.process_all_subscription_renewals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_all_subscription_renewals() TO service_role;
