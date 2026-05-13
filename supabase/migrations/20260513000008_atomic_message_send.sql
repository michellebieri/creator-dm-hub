-- Atomic message send RPC: deducts wallet + inserts message + records transaction
-- in a single DB transaction. Prevents "paid but no message" race condition.

CREATE OR REPLACE FUNCTION public.send_paid_message(
  p_conversation_id   UUID,
  p_sender_id         UUID,
  p_creator_id        UUID,
  p_content           TEXT,
  p_message_type      TEXT DEFAULT 'text',
  p_voice_url         TEXT DEFAULT NULL,
  p_voice_duration    INT  DEFAULT NULL,
  p_price             NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance       NUMERIC;
  v_message_id    UUID;
  v_platform_fee  NUMERIC;
  v_net_amount    NUMERIC;
BEGIN
  -- Lock sender's row to prevent concurrent race conditions
  SELECT wallet_balance INTO v_balance
  FROM profiles
  WHERE id = p_sender_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_balance < p_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Deduct wallet
  UPDATE profiles
  SET wallet_balance = wallet_balance - p_price
  WHERE id = p_sender_id;

  -- Record wallet transaction
  INSERT INTO wallet_transactions (user_id, amount, transaction_type, description, related_user_id)
  VALUES (p_sender_id, -p_price, 'message', 'Message to creator', p_creator_id);

  -- Insert message
  INSERT INTO messages (
    conversation_id, sender_id, content,
    message_type, voice_url, voice_duration, is_paid
  )
  VALUES (
    p_conversation_id, p_sender_id, p_content,
    p_message_type, p_voice_url, p_voice_duration, true
  )
  RETURNING id INTO v_message_id;

  -- Record creator earnings (25% platform fee / 75% net)
  v_platform_fee := ROUND(p_price * 0.25, 2);
  v_net_amount   := p_price - v_platform_fee;

  INSERT INTO transactions (
    creator_id, customer_id, amount, transaction_type,
    platform_fee, net_amount, processor_fee, status, message_id
  )
  VALUES (
    p_creator_id, p_sender_id, p_price, 'message',
    v_platform_fee, v_net_amount, 0, 'completed', v_message_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id,
    'new_balance', v_balance - p_price
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_paid_message FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_paid_message TO authenticated;


-- Atomic subscription message increment: avoids read-then-write race condition
CREATE OR REPLACE FUNCTION public.use_subscription_message(
  p_usage_record_id UUID,
  p_conversation_id UUID,
  p_sender_id       UUID,
  p_content         TEXT,
  p_message_type    TEXT DEFAULT 'text',
  p_voice_url       TEXT DEFAULT NULL,
  p_voice_duration  INT  DEFAULT NULL,
  p_is_unlimited    BOOLEAN DEFAULT false,
  p_allowed         INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used          INT;
  v_allowed       INT;
  v_message_id    UUID;
BEGIN
  -- Atomically increment usage; fails if limit reached (for non-unlimited)
  IF p_is_unlimited THEN
    UPDATE subscription_message_usage
    SET messages_used = messages_used + 1,
        updated_at    = now()
    WHERE id = p_usage_record_id
    RETURNING messages_used, messages_allowed INTO v_used, v_allowed;
  ELSE
    UPDATE subscription_message_usage
    SET messages_used = messages_used + 1,
        updated_at    = now()
    WHERE id = p_usage_record_id
      AND messages_used < messages_allowed
    RETURNING messages_used, messages_allowed INTO v_used, v_allowed;
  END IF;

  IF NOT FOUND THEN
    -- Limit reached (or record gone)
    RETURN jsonb_build_object('success', false, 'error', 'No free messages remaining');
  END IF;

  -- Insert message inside the same transaction
  INSERT INTO messages (
    conversation_id, sender_id, content,
    message_type, voice_url, voice_duration, is_paid
  )
  VALUES (
    p_conversation_id, p_sender_id, p_content,
    p_message_type, p_voice_url, p_voice_duration, true
  )
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id,
    'messages_used', v_used,
    'messages_allowed', CASE WHEN p_is_unlimited THEN 999999 ELSE v_allowed END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.use_subscription_message FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.use_subscription_message TO authenticated;


-- Atomic bundle-credit message: decrements customer_credits.credits_remaining
-- AND inserts message in one DB transaction. Credits live in customer_credits
-- table (not message_packs — that table only holds pack definitions).
CREATE OR REPLACE FUNCTION public.send_bundle_message(
  p_customer_id     UUID,
  p_creator_id      UUID,
  p_conversation_id UUID,
  p_content         TEXT,
  p_message_type    TEXT DEFAULT 'text',
  p_voice_url       TEXT DEFAULT NULL,
  p_voice_duration  INT  DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit_id     UUID;
  v_remaining     INT;
  v_message_id    UUID;
BEGIN
  -- Lock the oldest credit row with available balance (prevents race conditions)
  SELECT id, credits_remaining INTO v_credit_id, v_remaining
  FROM customer_credits
  WHERE customer_id      = p_customer_id
    AND creator_id       = p_creator_id
    AND credits_remaining > 0
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_credit_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No bundle credits remaining');
  END IF;

  -- Atomically decrement credit
  UPDATE customer_credits
  SET credits_remaining = credits_remaining - 1,
      updated_at        = now()
  WHERE id = v_credit_id;

  -- Insert message in the same transaction
  INSERT INTO messages (
    conversation_id, sender_id, content,
    message_type, voice_url, voice_duration, is_paid
  )
  VALUES (
    p_conversation_id, p_customer_id, p_content,
    p_message_type, p_voice_url, p_voice_duration, true
  )
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id,
    'remaining', v_remaining - 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_bundle_message FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_bundle_message TO authenticated;
