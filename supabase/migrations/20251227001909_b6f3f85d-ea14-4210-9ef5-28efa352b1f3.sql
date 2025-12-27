-- Fix the SECURITY DEFINER view issue by recreating it with SECURITY INVOKER
DROP VIEW IF EXISTS public.unlockables_discovery;

CREATE VIEW public.unlockables_discovery 
WITH (security_invoker = true)
AS
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