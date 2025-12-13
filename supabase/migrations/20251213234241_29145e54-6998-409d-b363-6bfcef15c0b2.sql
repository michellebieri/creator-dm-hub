-- Drop the existing view
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate view WITHOUT SECURITY DEFINER (uses SECURITY INVOKER by default)
CREATE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  display_name,
  avatar_url,
  bio,
  role,
  created_at
FROM public.profiles
WHERE role = 'creator';

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Comment explaining the view
COMMENT ON VIEW public.public_profiles IS 'Public view of creator profiles - excludes sensitive fields like wallet_balance and stripe_customer_id';

-- Update RLS policy on profiles to be more restrictive for SELECT
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view creator profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_creators" ON public.profiles;

-- Users can always view their own full profile
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- For viewing other profiles, use get_public_profile function or public_profiles view
-- This prevents direct access to sensitive fields of other users