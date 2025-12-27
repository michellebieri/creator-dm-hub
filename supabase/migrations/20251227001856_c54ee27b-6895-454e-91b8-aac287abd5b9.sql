-- Fix 1: Profiles table - Remove public creator visibility, keep only authorized access
-- The public_profiles VIEW already exists for safe public discovery

DROP POLICY IF EXISTS "Conversation participants can view profiles" ON public.profiles;

CREATE POLICY "Authorized users can view profiles"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = id) OR 
  (EXISTS (
    SELECT 1 FROM conversations c
    WHERE ((c.creator_id = profiles.id) OR (c.customer_id = profiles.id))
    AND ((c.creator_id = auth.uid()) OR (c.customer_id = auth.uid()))
  ))
);

-- Fix 2: Unlockables table - Remove public SELECT policy that exposes media_url
-- Create a secure view for content discovery instead

DROP POLICY IF EXISTS "Anyone can view unlockables for content discovery" ON public.unlockables;

-- Create a secure view for content discovery (no media_url exposed)
CREATE OR REPLACE VIEW public.unlockables_discovery AS
SELECT 
  id,
  creator_id,
  media_type,
  price,
  title,
  caption,
  thumbnail_url,
  free_for_subscribers,
  created_at,
  expires_at
FROM public.unlockables;

-- Grant access to the discovery view
GRANT SELECT ON public.unlockables_discovery TO anon, authenticated;