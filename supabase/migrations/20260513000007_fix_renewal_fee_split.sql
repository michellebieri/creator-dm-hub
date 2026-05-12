-- Fix subscription renewal function: correct fee split to 25% platform / 75% creator
-- (was incorrectly set to 15%/85% in the original cron migration)

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
      AND cs.stripe_subscription_id IS NULL
      AND cs.current_period_end < v_now
    FOR UPDATE OF cs SKIP LOCKED
  LOOP
    BEGIN
      SELECT wallet_balance INTO v_balance
      FROM profiles WHERE id = v_sub.customer_id FOR UPDATE;

      IF v_balance IS NULL OR v_balance < v_sub.price THEN
        UPDATE creator_subscriptions SET status = 'past_due' WHERE id = v_sub.id;

        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (
          v_sub.customer_id,
          'subscription_payment_failed',
          'Subscription Renewal Failed',
          format('We couldn''t renew your subscription ($%s) — insufficient wallet balance. Add funds to reactivate.', round(v_sub.price::numeric, 2)),
          '/wallet'
        );

        v_failed := v_failed + 1;
        CONTINUE;
      END IF;

      UPDATE profiles
      SET wallet_balance = wallet_balance - v_sub.price
      WHERE id = v_sub.customer_id;

      INSERT INTO wallet_transactions (user_id, amount, transaction_type, description, related_user_id)
      VALUES (v_sub.customer_id, -v_sub.price, 'subscription', 'Subscription renewal', v_sub.creator_id);

      v_new_period_end := CASE v_sub.billing_interval
        WHEN 'yearly' THEN v_sub.current_period_end + INTERVAL '1 year'
        ELSE v_sub.current_period_end + INTERVAL '1 month'
      END;

      UPDATE creator_subscriptions
      SET
        status               = 'active',
        current_period_start = v_sub.current_period_end,
        current_period_end   = v_new_period_end
      WHERE id = v_sub.id;

      IF COALESCE(v_sub.free_messages_per_month, 0) > 0 THEN
        INSERT INTO subscription_message_usage
          (subscription_id, customer_id, creator_id, messages_allowed, messages_used, period_start, period_end)
        VALUES
          (v_sub.id, v_sub.customer_id, v_sub.creator_id,
           v_sub.free_messages_per_month, 0,
           v_sub.current_period_end, v_new_period_end)
        ON CONFLICT DO NOTHING;
      END IF;

      -- Correct split: 25% platform fee / 75% creator net
      v_platform_fee := ROUND(v_sub.price * 0.25, 2);
      v_net_amount   := v_sub.price - v_platform_fee;

      INSERT INTO transactions (
        creator_id, customer_id, amount, transaction_type,
        platform_fee, net_amount, processor_fee, status
      )
      VALUES (
        v_sub.creator_id, v_sub.customer_id, v_sub.price, 'subscription',
        v_platform_fee, v_net_amount, 0, 'completed'
      )
      RETURNING id INTO v_tx_id;

      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_sub.customer_id,
        'subscription_renewed',
        'Subscription Renewed',
        format('Your subscription has been renewed for $%s.', round(v_sub.price::numeric, 2)),
        '/subscriptions'
      );

      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_sub.creator_id,
        'subscription_payment',
        'Subscription Renewal Payment',
        format('A subscriber renewed — you earned $%s.', round(v_net_amount::numeric, 2)),
        '/earnings'
      );

      v_renewed := v_renewed + 1;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Renewal failed for subscription %: %', v_sub.id, SQLERRM;
      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('renewed', v_renewed, 'failed', v_failed);
END;
$$;

REVOKE ALL ON FUNCTION public.process_all_subscription_renewals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_all_subscription_renewals() TO service_role;
