-- Fix user_follows: add missing table-level GRANTs and restore public SELECT
-- so follower counts display on creator profiles without "permission denied".
-- Follow relationships are public info (same as any social platform).

-- Grant table-level permissions (required for RLS to even evaluate)
GRANT SELECT ON public.user_follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;

-- Restore public SELECT so fetchFollowersCount works for everyone
DROP POLICY IF EXISTS "Users can view own follows" ON public.user_follows;
DROP POLICY IF EXISTS "Users can view follows" ON public.user_follows;

CREATE POLICY "Anyone can view follows"
ON public.user_follows
FOR SELECT
USING (true);
