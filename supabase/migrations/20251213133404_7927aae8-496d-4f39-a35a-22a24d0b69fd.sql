-- ============================================
-- FIX: Column-level security via secure views
-- ============================================

-- Drop the overly permissive policy that was just created
DROP POLICY IF EXISTS "Authenticated users view limited creator info" ON public.profiles;

-- Create a security definer function to get public profile data safely
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id uuid)
RETURNS TABLE (
    id uuid,
    username text,
    display_name text,
    avatar_url text,
    bio text,
    role user_role,
    created_at timestamptz
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
        p.bio,
        p.role,
        p.created_at
    FROM public.profiles p
    WHERE p.id = profile_id
$$;

-- Create a function to get creator pricing safely (without sensitive data)
CREATE OR REPLACE FUNCTION public.get_creator_pricing(creator_id uuid)
RETURNS TABLE (
    user_id uuid,
    price_per_message numeric,
    is_accepting_messages boolean,
    bulk_message_amount integer,
    bulk_message_price numeric,
    first_three_free boolean,
    gift_messages boolean,
    gift_message_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        cs.user_id,
        cs.price_per_message,
        cs.is_accepting_messages,
        cs.bulk_message_amount,
        cs.bulk_message_price,
        cs.first_three_free,
        cs.gift_messages,
        cs.gift_message_count
    FROM public.creator_settings cs
    WHERE cs.user_id = creator_id
$$;

-- Create a function to search creators safely
CREATE OR REPLACE FUNCTION public.search_creators(search_query text DEFAULT NULL)
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
    WHERE p.role = 'creator'
    AND (
        search_query IS NULL 
        OR p.username ILIKE '%' || search_query || '%'
        OR p.display_name ILIKE '%' || search_query || '%'
    )
    ORDER BY p.display_name
    LIMIT 100
$$;

-- Create a function to get all creators for browsing
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
    WHERE p.role = 'creator'
    ORDER BY p.created_at DESC
$$;