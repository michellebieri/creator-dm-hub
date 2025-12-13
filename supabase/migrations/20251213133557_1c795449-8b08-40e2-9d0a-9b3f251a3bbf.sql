-- ============================================
-- FIX: Replace conversation partner policy with secure function
-- ============================================

-- Drop the overly permissive conversation partner policy
DROP POLICY IF EXISTS "Users can view conversation partner profiles" ON public.profiles;

-- Create a secure function to get conversation partner info (only safe fields)
CREATE OR REPLACE FUNCTION public.get_conversation_partner(partner_id uuid)
RETURNS TABLE (
    id uuid,
    username text,
    display_name text,
    avatar_url text,
    bio text,
    role user_role
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
        p.role
    FROM public.profiles p
    WHERE p.id = partner_id
    AND EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE (c.creator_id = partner_id OR c.customer_id = partner_id)
        AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
    )
$$;

-- Drop the creator_settings policy that exposes stripe_account_id
DROP POLICY IF EXISTS "Customers view creator pricing only" ON public.creator_settings;

-- Recreate with more restrictive access - only pricing fields, not via direct table access
-- Instead, customers should use the get_creator_pricing function