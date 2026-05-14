-- ── Tracking migration: BUG A + BUG B fixes ────────────────────────────────
-- Already applied via Supabase Dashboard SQL Editor on 2026-05-14. Recorded
-- here so the schema history matches the live database.
--
-- BUG A (column missing): creator_subscriptions.creator_id did not exist in
-- prod despite the handoff doc claiming migration 20260513000001 was applied.
-- This re-applies that migration's intent (column add + backfill + NOT NULL +
-- policy) AND fixes a separate bug discovered in the purchase_subscription
-- RPC: the wallet_transactions INSERT was missing the balance_after column
-- (NOT NULL since 20260513000005), which would have crashed every subscription
-- purchase at runtime.
--
-- BUG B (RLS too strict): customer can't load creator pricing on first chat
-- because creator_settings_select_own only allows reading own settings. Added
-- a parallel policy that lets authenticated users read pricing for any user
-- who is a 'creator' in user_roles. The pricing is already public on profile
-- pages by design.

-- BUG A part 1: column + backfill + NOT NULL
ALTER TABLE public.creator_subscriptions
  ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

UPDATE public.creator_subscriptions cs
SET creator_id = st.creator_id
FROM public.subscription_tiers st
WHERE cs.tier_id = st.id
  AND cs.creator_id IS NULL;

ALTER TABLE public.creator_subscriptions
  ALTER COLUMN creator_id SET NOT NULL;

-- BUG A part 2: RLS policy for creators viewing their subscribers
DROP POLICY IF EXISTS "Creators can view their own subscribers" ON public.creator_subscriptions;
CREATE POLICY "Creators can view their own subscribers"
  ON public.creator_subscriptions FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = customer_id);

-- BUG A part 3: purchase_subscription RPC with creator_id + balance_after
CREATE OR REPLACE FUNCTION public.purchase_subscription(
  p_tier_id    UUID,
  p_creator_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id     UUID;
  v_tier            RECORD;
  v_balance         NUMERIC;
  v_new_balance     NUMERIC;
  v_now             TIMESTAMPTZ := now();
  v_period_end      TIMESTAMPTZ;
  v_subscription_id UUID;
  v_platform_fee    NUMERIC;
  v_net_amount      NUMERIC;
  v_tx_id           UUID;
BEGIN
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF v_customer_id = p_creator_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot subscribe to yourself');
  END IF;

  SELECT * INTO v_tier FROM subscription_tiers
   WHERE id = p_tier_id AND creator_id = p_creator_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subscription tier not found');
  END IF;

  SELECT wallet_balance INTO v_balance FROM profiles WHERE id = v_customer_id FOR UPDATE;
  IF v_balance < v_tier.price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  v_new_balance := v_balance - v_tier.price;
  UPDATE profiles SET wallet_balance = v_new_balance WHERE id = v_customer_id;

  INSERT INTO wallet_transactions (user_id, amount, transaction_type, description, related_user_id, balance_after)
  VALUES (v_customer_id, -v_tier.price, 'subscription', 'Subscription purchase', p_creator_id, v_new_balance);

  v_period_end := CASE v_tier.billing_interval
    WHEN 'yearly' THEN v_now + INTERVAL '1 year'
    ELSE v_now + INTERVAL '1 month'
  END;

  INSERT INTO creator_subscriptions (customer_id, creator_id, tier_id, status, current_period_start, current_period_end)
  VALUES (v_customer_id, p_creator_id, p_tier_id, 'active', v_now, v_period_end)
  RETURNING id INTO v_subscription_id;

  IF v_tier.free_messages_per_month > 0 THEN
    INSERT INTO subscription_message_usage
      (subscription_id, customer_id, creator_id, messages_allowed, messages_used, period_start, period_end)
    VALUES
      (v_subscription_id, v_customer_id, p_creator_id, v_tier.free_messages_per_month, 0, v_now, v_period_end);
  END IF;

  v_platform_fee := ROUND(v_tier.price * 0.25, 2);
  v_net_amount   := v_tier.price - v_platform_fee;

  INSERT INTO transactions (creator_id, customer_id, amount, transaction_type, platform_fee, net_amount, status)
  VALUES (p_creator_id, v_customer_id, v_tier.price, 'subscription', v_platform_fee, v_net_amount, 'completed')
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'transaction_id', v_tx_id,
    'period_end', v_period_end
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_subscription TO authenticated;

-- BUG B: restore SELECT policy so customers can view creator pricing
DROP POLICY IF EXISTS "Authenticated users can view creator pricing" ON public.creator_settings;
CREATE POLICY "Authenticated users can view creator pricing"
ON public.creator_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = creator_settings.user_id
      AND ur.role = 'creator'
  )
);
