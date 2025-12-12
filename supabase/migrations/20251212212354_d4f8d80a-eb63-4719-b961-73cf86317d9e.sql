-- =====================================================
-- FIX 1: PUBLIC_USER_DATA - Restrict profiles table access
-- =====================================================

-- Drop existing policies on profiles to avoid conflicts
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view public profile info" ON public.profiles;

-- Users can view their own full profile
CREATE POLICY "Users can view own full profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Authenticated users can view basic public info of creators only
CREATE POLICY "Authenticated can view creator profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (role = 'creator');

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- =====================================================
-- FIX 2: PUBLIC_FINANCIAL_DATA - Restrict creator_settings table
-- =====================================================

-- Drop the overly permissive public policy and conflicting ones
DROP POLICY IF EXISTS "Public can view creator settings" ON public.creator_settings;
DROP POLICY IF EXISTS "Authenticated can view limited creator settings" ON public.creator_settings;

-- Only authenticated users can view creator settings (not anonymous/public)
CREATE POLICY "Authenticated can view creator settings"
ON public.creator_settings
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- FIX 3: EXPOSED_SENSITIVE_DATA - Restrict unlockables table
-- =====================================================

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view unlockables" ON public.unlockables;

-- Only conversation participants and creators can view unlockables
-- The existing policy "Conversation participants can view unlockables" handles this