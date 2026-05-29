-- ============================================================
-- Proactive Outreach Cron Job
-- ============================================================
-- DO NOT APPLY until the following questions are resolved:
--
--   1. Auto-reply must be confirmed working end-to-end first.
--
--   2. BILLING/CONSENT QUESTION FOR MICHELLE:
--      If fans are charged per message, does an AI-initiated outreach
--      message charge the fan without their explicit action?
--      AI-generated charges the fan did not initiate are a chargeback
--      magnet and a consent problem. Clarify before enabling.
--
-- This migration requires pg_cron and pg_net extensions to be enabled
-- in the Supabase project (Dashboard → Database → Extensions).
-- ============================================================

-- Schedule ai-proactive-outreach to run every hour.
-- Adjust the cron expression and URL as needed.
select cron.schedule(
  'ai-proactive-outreach-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url     := 'https://jhzcmdsaajvftjbhdunt.supabase.co/functions/v1/ai-proactive-outreach',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := '{}'::jsonb
  );
  $$
);
