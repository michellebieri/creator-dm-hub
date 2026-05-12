-- Fix get_public_creators to use user_roles (authoritative) instead of profiles.role (legacy)
CREATE OR REPLACE FUNCTION public.get_public_creators()
RETURNS TABLE (
    id uuid,
    username text,
    display_name text,
    avatar_url text,
    bio text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p.id,
        p.username,
        p.display_name,
        p.avatar_url,
        p.bio
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'creator'
    ORDER BY p.created_at DESC
$$;
