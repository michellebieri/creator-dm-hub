-- Add social media / vetting fields to creator_verifications so the admin has
-- real information to evaluate each creator application.

ALTER TABLE public.creator_verifications
  ADD COLUMN IF NOT EXISTS instagram_handle   TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_handle      TEXT,
  ADD COLUMN IF NOT EXISTS twitter_handle     TEXT,
  ADD COLUMN IF NOT EXISTS follower_count     TEXT,   -- stored as text ("10k-50k" range)
  ADD COLUMN IF NOT EXISTS content_niche      TEXT,   -- e.g. "fitness", "music", "lifestyle"
  ADD COLUMN IF NOT EXISTS about_yourself     TEXT,   -- free-text: why do you want to join?
  ADD COLUMN IF NOT EXISTS admin_notes        TEXT;   -- internal notes from reviewer

-- Admins can read and update all applications
CREATE POLICY IF NOT EXISTS "Admins can manage creator verifications"
  ON public.creator_verifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
