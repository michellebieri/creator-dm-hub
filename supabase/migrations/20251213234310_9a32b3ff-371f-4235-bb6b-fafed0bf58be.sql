-- Drop and recreate the view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles CASCADE;

-- Create view with explicit security_invoker = true
CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
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

-- Grant access
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

COMMENT ON VIEW public.public_profiles IS 'Public view of creator profiles - uses SECURITY INVOKER';