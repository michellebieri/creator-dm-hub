-- ── H2: scheduled-messages cron with FOR UPDATE SKIP LOCKED ─────────────────
-- The function originally defined in 20260514000001 selects pending rows
-- without row-level locks. Two overlapping invocations (manual call during a
-- cron tick, or a slow tick spilling past the next minute) can each read the
-- same pending rows and each INSERT a message into public.messages — the
-- scheduled message gets delivered twice.
--
-- This migration is intentionally a superset of 20260514000001 so a single
-- apply leaves the database in the correct final state regardless of whether
-- the earlier migration was applied:
--   • If the function exists: CREATE OR REPLACE upgrades it to the locked
--     version. No downtime — the swap is atomic; in-flight cron invocations
--     finish on the old function and the next tick uses the new one.
--   • If the function does not exist: it is created here.
--   • If the cron job exists: skipped (idempotent DO block).
--   • If the cron job does not exist: scheduled here.

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
  -- FOR UPDATE SKIP LOCKED: a concurrent invocation cannot see this row's
  -- pending state — it will be skipped over and re-picked on the next tick
  -- once this transaction commits. Locks are held until the function returns.
  FOR msg IN
    SELECT *
    FROM public.scheduled_messages
    WHERE status = 'pending'
      AND scheduled_at <= NOW()
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
        COALESCE(msg.message_type, 'text'),
        msg.voice_url,
        msg.voice_duration,
        true  -- Scheduled messages are creator-sent, treated as free-to-send
      );

      UPDATE public.scheduled_messages
         SET status   = 'sent',
             sent_at  = NOW()
       WHERE id = msg.id;

      sent_count := sent_count + 1;

    EXCEPTION WHEN OTHERS THEN
      err_msg := SQLERRM;
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

-- ── Ensure the cron job exists ──────────────────────────────────────────────
-- pg_cron's cron.schedule throws on duplicate jobname, so we guard with a
-- pre-check rather than calling unconditionally.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-messages'
  ) THEN
    PERFORM cron.schedule(
      'process-scheduled-messages',
      '* * * * *',
      $cron$SELECT public.process_pending_scheduled_messages()$cron$
    );
  END IF;
END
$$;
