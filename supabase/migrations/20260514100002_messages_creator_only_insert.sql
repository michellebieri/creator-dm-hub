-- ── Close the customer-side message INSERT bypass (C2) ──────────────────────
-- Old policy "Conversation participants can send messages" lets any conversation
-- participant insert a message with any `is_paid` value — a customer could open
-- devtools and bypass send_paid_message / use_subscription_message /
-- send_bundle_message entirely. Atomic RPCs become optional from the client.
--
-- Fix: restrict raw INSERTs to the creator side only. Customer-side messages
-- MUST go through one of the SECURITY DEFINER RPCs (existing send_paid_message,
-- use_subscription_message, send_bundle_message, or the new
-- send_first_three_free_message below).
--
-- check-auto-reply and ai-proactive-outreach edge functions use the service_role
-- key and bypass RLS — they are unaffected.

DROP POLICY IF EXISTS "Conversation participants can send messages" ON public.messages;

CREATE POLICY "Creators can insert messages directly"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
        AND creator_id = auth.uid()
    )
  );

-- ── New RPC: atomic "first 3 free" customer send ─────────────────────────────
-- Replaces the racy client-side count-then-insert in src/hooks/useMessages.tsx.
-- Uses a transaction-scoped advisory lock keyed on (conversation_id, sender_id)
-- to serialize concurrent sends from the same customer in the same conversation,
-- closing the count→insert race that lets spam-clicks land 4+ "free" messages.

CREATE OR REPLACE FUNCTION public.send_first_three_free_message(
  p_conversation_id UUID,
  p_sender_id       UUID,
  p_creator_id      UUID,
  p_content         TEXT,
  p_message_type    TEXT    DEFAULT 'text',
  p_voice_url       TEXT    DEFAULT NULL,
  p_voice_duration  INTEGER DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_three_free BOOLEAN;
  v_count            INT;
  v_message_id       UUID;
  v_lock_key         BIGINT;
BEGIN
  -- 1. Caller must be the sender they claim to be
  IF auth.uid() IS NULL OR auth.uid() <> p_sender_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- 2. Caller must be the customer side of the named conversation,
  --    and the creator must match
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id          = p_conversation_id
      AND customer_id = p_sender_id
      AND creator_id  = p_creator_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant');
  END IF;

  -- 3. Creator must have the "first 3 messages free" toggle on
  SELECT first_three_free
    INTO v_first_three_free
    FROM public.creator_settings
   WHERE user_id = p_creator_id;

  IF v_first_three_free IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature not enabled');
  END IF;

  -- 4. Serialize concurrent first-three-free sends from the same customer in
  --    the same conversation so the count check + insert are atomic.
  v_lock_key := hashtextextended(p_conversation_id::text || ':' || p_sender_id::text, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 5. Count this customer's already-paid messages in this conversation.
  --    (is_paid=true is the same semantic the old client-side check used.)
  SELECT COUNT(*)
    INTO v_count
    FROM public.messages
   WHERE conversation_id = p_conversation_id
     AND sender_id       = p_sender_id
     AND is_paid         = true;

  IF v_count >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No free messages remaining');
  END IF;

  -- 6. Insert the message
  INSERT INTO public.messages (
    conversation_id, sender_id, content, message_type,
    voice_url, voice_duration, is_paid
  ) VALUES (
    p_conversation_id, p_sender_id, p_content, p_message_type,
    p_voice_url, p_voice_duration, true
  )
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object(
    'success',    true,
    'message_id', v_message_id,
    'remaining',  GREATEST(0, 2 - v_count)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_first_three_free_message(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER
) TO authenticated;
