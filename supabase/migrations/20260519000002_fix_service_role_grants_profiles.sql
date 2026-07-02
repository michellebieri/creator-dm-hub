-- Fix additional missing SELECT/INSERT grants for service_role.
-- The previous migration (20260519000001) covered the tables queried in the main
-- happy-path of check-auto-reply but missed:
--   • profiles      — queried for creatorProfile/fanProfile display names
--   • ai_draft_messages — INSERT target when mode='draft'
--   • auto_replies  — queried in handleLegacyAutoReply
-- Without these, the AI reply either sends with null names or silently fails to
-- insert draft messages.

GRANT SELECT ON public.profiles TO service_role;
GRANT SELECT, INSERT ON public.ai_draft_messages TO service_role;
GRANT SELECT ON public.auto_replies TO service_role;
