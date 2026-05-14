-- ── Restore table-level GRANTs the security lockdown stripped ──────────────
-- Discovered via live UI smoke against production: 8 pages return 42501
-- "permission denied for table X" because authenticated lacks SELECT/INSERT
-- on multiple public tables. The lockdown intent was apparently to rely on
-- RLS — but Postgres requires table-level GRANT first, BEFORE RLS evaluates.
-- Without these grants, RLS never gets a chance to allow rows.
--
-- RLS continues to gate which rows the user can see/modify (own data only).
-- These grants only restore the table-level *permission* to attempt reads/writes.
--
-- Anon grants on conversations + user_roles are required so the public creator
-- profile RLS policy on `profiles` can evaluate without erroring (the policy
-- joins to conversations and user_roles in its EXISTS clauses).

-- ── Messaging chain (core launch path) ─────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_messages TO authenticated;

-- ── Entitlement reads (so the chat view can determine send options) ────────
GRANT SELECT ON public.creator_subscriptions TO authenticated;
GRANT SELECT ON public.subscription_tiers TO authenticated;
GRANT SELECT ON public.customer_credits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscription_message_usage TO authenticated;

-- ── Dashboard, library, activity tiles ─────────────────────────────────────
GRANT SELECT, INSERT, DELETE ON public.content_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT SELECT ON public.activity_feed TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;

-- ── Notifications display ──────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- ── Anon access so public creator profile page evaluates its RLS policy ────
-- Without these, the EXISTS clauses in profiles_select_policy error with
-- "permission denied for table conversations" and the page shows
-- "Creator not found". RLS continues to filter rows correctly:
--   conversations: USING (auth.uid() = creator_id OR auth.uid() = customer_id)
--     → anon (no auth.uid) sees 0 rows
--   user_roles: "Anyone can view creator roles" USING (role = 'creator')
--     → anon sees only creator role rows (already implicit via public URLs)
GRANT SELECT ON public.conversations TO anon;
GRANT SELECT ON public.user_roles TO anon;
