-- ── Scheduled Messages Cron Job ───────────────────────────────────────────────
-- Processes pending scheduled_messages every minute via pg_cron.
-- pg_net extension is used to call the edge function (already available on Supabase).

-- SQL function: process all pending scheduled messages that are due now
CREATE OR REPLACE FUNCTION process_pending_scheduled_messages()
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
  -- Loop over all due pending messages
  FOR msg IN
    SELECT *
    FROM public.scheduled_messages
    WHERE status = 'pending'
      AND scheduled_at <= NOW()
    ORDER BY scheduled_at ASC
  LOOP
    processed_count := processed_count + 1;
    BEGIN
      -- Insert the actual message
      INSERT INTO public.messages (
        conversation_id,
        sender_id,
        content,
        message_type,
        voice_url,
        voice_duration,
        is_paid
      ) VALUES (
        msg.conversation_id,
        msg.sender_id,
        msg.content,
        COALESCE(msg.message_type, 'text'),
        msg.voice_url,
        msg.voice_duration,
        true  -- Scheduled messages are from creators, treated as free-to-send
      );

      -- Mark as sent
      UPDATE public.scheduled_messages
      SET status   = 'sent',
          sent_at  = NOW()
      WHERE id = msg.id;

      sent_count := sent_count + 1;

    EXCEPTION WHEN OTHERS THEN
      err_msg := SQLERRM;
      -- Mark as failed
      UPDATE public.scheduled_messages
      SET status        = 'failed',
          error_message = err_msg
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

-- ── pg_cron schedule ──────────────────────────────────────────────────────────
-- Runs every minute. pg_cron is enabled by default on Supabase.
SELECT cron.schedule(
  'process-scheduled-messages',
  '* * * * *',
  $$SELECT process_pending_scheduled_messages()$$
);
