-- ── LB#1 Fix: Creator approval pipeline ─────────────────────────────────────
--
-- Three compounding defects (per CoWork QA report 2026-05-15) made onboarding
-- impossible for any new creator:
--
--   DEFECT B (decisive) — migration 20260512000006 used
--     `CREATE POLICY IF NOT EXISTS …`
--     which is invalid PostgreSQL syntax (CREATE POLICY has no IF NOT EXISTS
--     clause). The statement raised a syntax error, so the admin RLS policy
--     on creator_verifications was never created. Admin queries returned
--     zero rows for "other users' applications".
--
--   DEFECT A — frontend swallowed write errors in submitApplication() so
--     failures showed a false "Application Submitted!" screen.
--
--   DEFECT C — handleSignIn's no-verification-row branch *also* navigated
--     to /creator-application-pending, faking "Application Under Review".
--
-- Also discovered: even with the admin SELECT policy on creator_verifications
-- fixed, the admin still couldn't list users because `profiles` and
-- `user_roles` only have "select own" policies — admins see only their own
-- row. AND `handleApprove` calls `UPDATE profiles SET role='creator'`, but
-- the role column was column-level REVOKE'd from authenticated yesterday
-- (security C1) — so the update silently fails as 0-rows-affected.
--
-- Platform-wide fix:
--   1. Replace the invalid CREATE POLICY IF NOT EXISTS with proper
--      DROP IF EXISTS + CREATE for the admin policy on creator_verifications.
--   2. Add admin SELECT policies on profiles and user_roles.
--   3. Add SECURITY DEFINER RPCs for admin approve/reject (works around the
--      profiles.role column REVOKE; centralizes the multi-table update
--      atomically; returns proper {success, error} so the frontend can
--      surface real errors).
--
-- No hardcoded UUIDs. Works for any creator + any admin. Idempotent.

-- ── 1. Admin RLS policy on creator_verifications ────────────────────────────
DROP POLICY IF EXISTS "Admins can manage creator verifications" ON public.creator_verifications;
CREATE POLICY "Admins can manage creator verifications"
  ON public.creator_verifications
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 2. Admin SELECT on profiles ─────────────────────────────────────────────
-- The user dashboard needs all profiles. The existing "profiles_select_own"
-- policy only returns the admin's own row.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── 3. Admin SELECT on user_roles ───────────────────────────────────────────
-- Same: admins need to see who has what role.
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── 4. Admin approve RPC ────────────────────────────────────────────────────
-- Updates user_roles (grants 'creator'), profiles.role (legacy, blocked by
-- column-REVOKE for direct UPDATE — SECURITY DEFINER bypasses), and
-- creator_verifications.status. All atomic in one transaction.
CREATE OR REPLACE FUNCTION public.admin_approve_creator_application(
  p_application_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id  UUID := auth.uid();
  v_creator   UUID;
BEGIN
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not authenticated');
  END IF;
  IF NOT public.has_role(v_admin_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not admin');
  END IF;

  SELECT creator_id INTO v_creator FROM creator_verifications WHERE id = p_application_id;
  IF v_creator IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'application not found');
  END IF;

  -- Mark verification approved
  UPDATE creator_verifications
     SET status      = 'approved',
         verified_at = now(),
         reviewed_by = v_admin_id
   WHERE id = p_application_id;

  -- Grant creator role
  INSERT INTO user_roles (user_id, role)
  VALUES (v_creator, 'creator')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Legacy profiles.role (column-REVOKE'd from authenticated; SECURITY DEFINER bypasses)
  UPDATE profiles SET role = 'creator' WHERE id = v_creator;

  RETURN jsonb_build_object('success', true, 'creator_id', v_creator);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_creator_application(UUID) TO authenticated;

-- ── 5. Admin reject RPC ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reject_creator_application(
  p_application_id UUID,
  p_reason         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
BEGIN
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not authenticated');
  END IF;
  IF NOT public.has_role(v_admin_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not admin');
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'reason is required');
  END IF;

  UPDATE creator_verifications
     SET status            = 'rejected',
         rejection_reason  = p_reason,
         reviewed_by       = v_admin_id
   WHERE id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'application not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reject_creator_application(UUID, TEXT) TO authenticated;

-- ── 6. submit_creator_application RPC (idempotent, error-surfacing) ─────────
-- The existing INSERT policy "Creators can submit verification" works at the
-- RLS layer, but the client code was swallowing errors. Wrapping in a RPC
-- gives a clean {success, error} contract the frontend can surface, and
-- removes any FK-race concern by guarding profile existence.
CREATE OR REPLACE FUNCTION public.submit_creator_application(
  p_instagram     TEXT,
  p_tiktok        TEXT,
  p_twitter       TEXT,
  p_follower_range TEXT,
  p_niche         TEXT,
  p_about         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not authenticated');
  END IF;

  -- Ensure profile exists (handle_new_user trigger should have created it,
  -- but be defensive in case of edge cases).
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile not found — try signing out and back in');
  END IF;

  -- Idempotent upsert; one application per user.
  INSERT INTO creator_verifications (
    creator_id, status, instagram_handle, tiktok_handle, twitter_handle,
    follower_count, content_niche, about_yourself, submitted_at
  )
  VALUES (
    v_uid, 'pending', p_instagram, p_tiktok, p_twitter,
    p_follower_range, p_niche, p_about, now()
  )
  ON CONFLICT (creator_id) DO UPDATE
    SET status            = 'pending',
        instagram_handle  = EXCLUDED.instagram_handle,
        tiktok_handle     = EXCLUDED.tiktok_handle,
        twitter_handle    = EXCLUDED.twitter_handle,
        follower_count    = EXCLUDED.follower_count,
        content_niche     = EXCLUDED.content_niche,
        about_yourself    = EXCLUDED.about_yourself,
        submitted_at      = now(),
        rejection_reason  = NULL,
        reviewed_by       = NULL,
        verified_at       = NULL;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_creator_application(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
