-- Drop existing restrictive views if they exist
DROP VIEW IF EXISTS public.public_profiles;
DROP VIEW IF EXISTS public.creator_public_profiles;

-- Create a view for public profile information (non-sensitive fields only)
CREATE OR REPLACE VIEW public.public_profiles AS
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

-- Add RLS policy for conversation participants to view each other's profiles
-- First, drop existing policies if they conflict
DROP POLICY IF EXISTS "Conversation participants can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their conversations" ON public.profiles;

-- Create policy allowing conversation participants to see each other's profiles
CREATE POLICY "Conversation participants can view profiles"
ON public.profiles
FOR SELECT
USING (
  -- User can always see their own profile
  auth.uid() = id
  OR
  -- User can see profiles of people they have conversations with
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.creator_id = profiles.id OR c.customer_id = profiles.id)
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  )
  OR
  -- Anyone can see creator profiles (for discovery)
  role = 'creator'
);