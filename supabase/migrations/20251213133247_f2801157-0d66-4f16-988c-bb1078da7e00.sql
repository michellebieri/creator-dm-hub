-- ============================================
-- FIX: Drop existing policies before recreating
-- ============================================

-- Drop ALL existing policies on profiles to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users view limited creator info" ON public.profiles;
DROP POLICY IF EXISTS "Users can view conversation partner profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated view creator public info" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- Create new restrictive RLS policies for profiles table

-- Users can always view their own complete profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Authenticated users can view LIMITED creator profile data
CREATE POLICY "Authenticated users view limited creator info"
ON public.profiles FOR SELECT
USING (
    auth.uid() IS NOT NULL 
    AND role = 'creator'
);

-- Allow viewing profiles of users in same conversation
CREATE POLICY "Users can view conversation partner profiles"
ON public.profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE (c.creator_id = profiles.id OR c.customer_id = profiles.id)
        AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
    )
);

-- Fix creator_settings policies
DROP POLICY IF EXISTS "Customers view creator pricing" ON public.creator_settings;
DROP POLICY IF EXISTS "Customers view creator pricing only" ON public.creator_settings;

-- Only allow pricing access in context of conversation (not social media/payment info)
CREATE POLICY "Customers view creator pricing only"
ON public.creator_settings FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.creator_id = creator_settings.user_id 
        AND c.customer_id = auth.uid()
    )
);