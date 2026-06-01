-- P0 Fix: auto-create creator_ai_personas row when admin approves a creator
--
-- Previously admin_approve_creator_application granted the creator role and
-- updated profiles, but never inserted into creator_ai_personas. As a result,
-- check-auto-reply's .maybeSingle() returned null for every new creator, causing
-- the AI system to silently skip all auto-replies.
--
-- Fix: replace the RPC to include the ai_personas insert (ON CONFLICT DO NOTHING
-- so re-running approve on an already-approved creator is safe).
--
-- Also backfills any approved creators who are currently missing the row.
-- No hardcoded UUIDs. Idempotent.

-- ── 1. Replace admin_approve_creator_application ─────────────────────────────
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

  -- Auto-create AI persona row (off by default; creator configures in onboarding / settings).
  -- ON CONFLICT DO NOTHING: safe to call multiple times on the same creator.
  INSERT INTO creator_ai_personas (
    creator_id,
    is_enabled,
    mode,
    tone,
    auto_reply_delay_minutes,
    upsell_aggressiveness,
    created_at,
    updated_at
  )
  VALUES (
    v_creator,
    false,
    'auto',
    'friendly',
    2,
    'light',
    now(),
    now()
  )
  ON CONFLICT (creator_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'creator_id', v_creator);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_creator_application(UUID) TO authenticated;

-- ── 2. Backfill existing approved creators missing an ai_personas row ─────────
INSERT INTO creator_ai_personas (
  creator_id,
  is_enabled,
  mode,
  tone,
  auto_reply_delay_minutes,
  upsell_aggressiveness,
  created_at,
  updated_at
)
SELECT
  ur.user_id,
  false,
  'auto',
  'friendly',
  2,
  'light',
  now(),
  now()
FROM user_roles ur
LEFT JOIN creator_ai_personas cap ON cap.creator_id = ur.user_id
WHERE ur.role = 'creator'
  AND cap.creator_id IS NULL;
