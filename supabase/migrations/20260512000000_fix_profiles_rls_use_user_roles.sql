-- ============================================================
-- Fix profiles RLS: use user_roles table to identify creators
-- The old policy checked profiles.role = 'creator' which is wrong —
-- roles live in user_roles, not profiles.role.
-- This also adds anon SELECT so public creator profile pages work.
-- ============================================================

-- Drop the broken policy
DROP POLICY IF EXISTS "Conversation participants can view profiles" ON public.profiles;

-- Drop any other SELECT policies that might conflict
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- New permissive SELECT policy:
-- 1. Own profile always visible
-- 2. Conversation partners visible
-- 3. Actual creators (in user_roles) visible to anyone — needed for public profile pages & search
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
USING (
  -- Anyone can read their own profile
  auth.uid() = id
  OR
  -- Conversation participants can see each other
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.creator_id = profiles.id OR c.customer_id = profiles.id)
      AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  )
  OR
  -- Anyone (including anon) can see profiles of real creators
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.id
      AND ur.role = 'creator'
  )
);

-- Grant anon SELECT so public creator profile pages work without login
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.profiles TO authenticated;

-- Also fix public_profiles view — recreate it with SECURITY DEFINER so it bypasses RLS
-- and always returns safe public fields to anyone
DROP VIEW IF EXISTS public.public_profiles;

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false)
AS
SELECT
  id,
  username,
  display_name,
  avatar_url,
  bio,
  created_at
FROM public.profiles;

-- Grant view access
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- ============================================================
-- Also ensure content_bundles and bundle_contents are readable
-- by anon/authenticated for creator profile pages
-- ============================================================

-- content_bundles: anyone can read active bundles (needed on creator profile)
DROP POLICY IF EXISTS "content_bundles_select_policy" ON public.content_bundles;
DROP POLICY IF EXISTS "Anyone can view active bundles" ON public.content_bundles;

CREATE POLICY "content_bundles_select_public"
ON public.content_bundles
FOR SELECT
USING (is_active = true OR creator_id = auth.uid());

GRANT SELECT ON public.content_bundles TO anon;
GRANT SELECT ON public.content_bundles TO authenticated;

-- bundle_contents: readable alongside content_bundles
DROP POLICY IF EXISTS "bundle_contents_select_policy" ON public.bundle_contents;
DROP POLICY IF EXISTS "Anyone can view bundle contents" ON public.bundle_contents;

CREATE POLICY "bundle_contents_select_public"
ON public.bundle_contents
FOR SELECT
USING (true);

GRANT SELECT ON public.bundle_contents TO anon;
GRANT SELECT ON public.bundle_contents TO authenticated;

-- unlockables: already fixed previously, but re-affirm grants
GRANT SELECT ON public.unlockables TO anon;
GRANT SELECT ON public.unlockables TO authenticated;
