-- ── Tracking migration for the systemic audit fixes ────────────────────────
-- Applied via Supabase Dashboard SQL Editor on 2026-05-14. Recorded here so
-- the schema history matches the live database.
--
-- Both bugs were the same classes already fixed in send_paid_message and
-- the four message-send RPCs, but hidden in cron-driven functions that
-- don't get tested by normal UI flows. They were time bombs that would
-- have crashed silently on cron ticks (no user notice).
--
-- BUG X1: process_all_subscription_renewals — wallet_transactions INSERT
-- was missing the balance_after NOT NULL column. Caught by the EXCEPTION
-- block so the cron kept running, but every renewal silently failed → all
-- subscriptions would flip to 'past_due' on next nightly tick.
--
-- BUG X2: process_pending_scheduled_messages — INSERT into messages used
-- COALESCE(msg.message_type, 'text') without ::public.message_type cast.
-- scheduled_messages.message_type is TEXT, messages.message_type is enum.
-- Same enum-cast bug we fixed earlier in send_paid_message. Every
-- scheduled message would be marked 'failed' once the cron picked it up.

-- ── FIX X1: process_all_subscription_renewals with balance_after ───────────
CREATE OR REPLACE FUNCTION public.process_all_subscription_renewals()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub             RECORD;
  v_balance         NUMERIC;
  v_new_balance     NUMERIC;
  v_now             TIMESTAMPTZ := now();
  v_new_period_end  TIMESTAMPTZ;
  v_platform_fee    NUMERIC;
  v_net_amount      NUMERIC;
  v_tx_id           UUID;
  v_renewed         INT := 0;
  v_failed          INT := 0;
BEGIN
  FOR v_sub IN
    SELECT cs.id, cs.customer_id, cs.creator_id, cs.tier_id, cs.current_period_end,
           st.price, st.billing_interval, st.free_messages_per_month, st.name AS tier_name
    FROM creator_subscriptions cs
    JOIN subscription_tiers st ON st.id = cs.tier_id
    WHERE cs.status = 'active' AND cs.stripe_subscription_id IS NULL
      AND cs.current_period_end < v_now
    FOR UPDATE OF cs SKIP LOCKED
  LOOP
    BEGIN
      SELECT wallet_balance INTO v_balance
      FROM profiles WHERE id = v_sub.customer_id FOR UPDATE;

      IF v_balance IS NULL OR v_balance < v_sub.price THEN
        UPDATE creator_subscriptions SET status = 'past_due' WHERE id = v_sub.id;
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (v_sub.customer_id, 'subscription_payment_failed',
          'Subscription Renewal Failed',
          format('We couldn''t renew your subscription ($%s) — insufficient wallet balance. Add funds to reactivate.', round(v_sub.price::numeric, 2)),
          '/wallet');
        v_failed := v_failed + 1;
        CONTINUE;
      END IF;

      v_new_balance := v_balance - v_sub.price;
      UPDATE profiles SET wallet_balance = v_new_balance WHERE id = v_sub.customer_id;

      INSERT INTO wallet_transactions (user_id, amount, transaction_type, description, related_user_id, balance_after)
      VALUES (v_sub.customer_id, -v_sub.price, 'subscription', 'Subscription renewal', v_sub.creator_id, v_new_balance);

      v_new_period_end := CASE v_sub.billing_interval
        WHEN 'yearly' THEN v_sub.current_period_end + INTERVAL '1 year'
        ELSE v_sub.current_period_end + INTERVAL '1 month'
      END;

      UPDATE creator_subscriptions
      SET status = 'active', current_period_start = v_sub.current_period_end,
          current_period_end = v_new_period_end
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

      v_platform_fee := ROUND(v_sub.price * 0.25, 2);
      v_net_amount   := v_sub.price - v_platform_fee;

      INSERT INTO transactions (creator_id, customer_id, amount, transaction_type,
        platform_fee, net_amount, processor_fee, status)
      VALUES (v_sub.creator_id, v_sub.customer_id, v_sub.price, 'subscription',
        v_platform_fee, v_net_amount, 0, 'completed')
      RETURNING id INTO v_tx_id;

      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (v_sub.customer_id, 'subscription_renewed',
        'Subscription Renewed',
        format('Your subscription has been renewed for $%s.', round(v_sub.price::numeric, 2)),
        '/subscriptions');

      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (v_sub.creator_id, 'subscription_payment',
        'Subscription Renewal Payment',
        format('A subscriber renewed — you earned $%s.', round(v_net_amount::numeric, 2)),
        '/earnings');

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

-- ── FIX X2: process_pending_scheduled_messages with ::message_type cast ────
CREATE OR REPLACE FUNCTION public.process_pending_scheduled_messages()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg            RECORD;
  processed_count INT := 0;
  sent_count      INT := 0;
  failed_count    INT := 0;
  err_msg         TEXT;
BEGIN
  FOR msg IN
    SELECT * FROM public.scheduled_messages
    WHERE status = 'pending' AND scheduled_at <= NOW()
    ORDER BY scheduled_at ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    processed_count := processed_count + 1;
    BEGIN
      INSERT INTO public.messages (
        conversation_id, sender_id, content, message_type,
        voice_url, voice_duration, is_paid
      ) VALUES (
        msg.conversation_id,
        msg.sender_id,
        msg.content,
        COALESCE(msg.message_type, 'text')::public.message_type,
        msg.voice_url,
        msg.voice_duration,
        true
      );
      UPDATE public.scheduled_messages
         SET status = 'sent', sent_at = NOW()
       WHERE id = msg.id;
      sent_count := sent_count + 1;
    EXCEPTION WHEN OTHERS THEN
      err_msg := SQLERRM;
      UPDATE public.scheduled_messages
         SET status = 'failed', error_message = err_msg
       WHERE id = msg.id;
      failed_count := failed_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', processed_count,
    'sent',      sent_count,
    'failed',    failed_count,
    'ran_at',    NOW()
  );
END;
$$;
