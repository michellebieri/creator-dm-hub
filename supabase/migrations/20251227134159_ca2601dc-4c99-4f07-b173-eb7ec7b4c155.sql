-- Create a secure function for checking platform owner status
-- This allows authenticated users to check if they are the platform owner
-- without exposing the actual platform_owner_user_id to everyone

CREATE OR REPLACE FUNCTION public.check_is_platform_owner()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_config 
    WHERE platform_owner_user_id = auth.uid()
    LIMIT 1
  );
$$;