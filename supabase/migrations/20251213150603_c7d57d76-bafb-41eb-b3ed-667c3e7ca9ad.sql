-- Drop the security definer view and recreate with security_invoker
DROP VIEW IF EXISTS public.public_profiles;

-- Create view with SECURITY INVOKER (default, but explicit for clarity)
-- This ensures the view respects RLS policies of the querying user
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  username,
  display_name,
  avatar_url,
  bio,
  role,
  created_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;