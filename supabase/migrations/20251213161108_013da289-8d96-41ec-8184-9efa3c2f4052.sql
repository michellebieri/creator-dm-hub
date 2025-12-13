-- Fix the SECURITY DEFINER view warning
-- Drop and recreate as a regular view (invoker security)

DROP VIEW IF EXISTS public.public_profiles;

-- Recreate as a standard view with SECURITY INVOKER (default)
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

-- Grant select on the view to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;