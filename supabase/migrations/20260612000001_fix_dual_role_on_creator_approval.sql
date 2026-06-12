-- Fix dual-role bug: approved creators should have ONLY 'creator' role,
-- not both 'creator' and 'customer'. When admin approves a creator
-- application, remove the default 'customer' row that handle_new_user
-- inserted at signup.

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

  -- Remove the default 'customer' role so the account is creator-only.
  -- Creators should not see fan-side UI (wallet, subscriptions, follow lists).
  DELETE FROM user_roles WHERE user_id = v_creator AND role = 'customer';

  -- Legacy profiles.role (column-REVOKE'd from authenticated; SECURITY DEFINER bypasses)
  UPDATE profiles SET role = 'creator' WHERE id = v_creator;

  RETURN jsonb_build_object('success', true, 'creator_id', v_creator);
END;
$$;

-- Clean up existing approved creators who still have dual roles
DELETE FROM user_roles ur
WHERE ur.role = 'customer'
  AND EXISTS (
    SELECT 1 FROM user_roles ur2
    WHERE ur2.user_id = ur.user_id AND ur2.role = 'creator'
  );
