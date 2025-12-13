-- COMPREHENSIVE SECURITY LOCKDOWN
-- Run this as a single migration to fix all RLS issues at once

-- ============================================
-- STEP 1: DROP ALL EXISTING POLICIES (Clean Slate)
-- ============================================

-- profiles table
DROP POLICY IF EXISTS "Anyone can view creator profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- payment_methods table
DROP POLICY IF EXISTS "Users can view own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can insert own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete own payment methods" ON public.payment_methods;

-- transactions table
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Only service role can insert transactions" ON public.transactions;

-- creator_settings table
DROP POLICY IF EXISTS "Creators can view own settings" ON public.creator_settings;
DROP POLICY IF EXISTS "Creators can update own settings" ON public.creator_settings;
DROP POLICY IF EXISTS "Creators can insert own settings" ON public.creator_settings;
DROP POLICY IF EXISTS "Anyone can view creator pricing" ON public.creator_settings;

-- ============================================
-- STEP 2: ENSURE RLS IS ENABLED ON ALL TABLES
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: CREATE SECURE POLICIES
-- ============================================

-- PROFILES TABLE --
-- Users can only view their own profile
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for signup)
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- PAYMENT_METHODS TABLE --
-- Users can only view their own payment methods
CREATE POLICY "payment_methods_select_own"
ON public.payment_methods FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own payment methods
CREATE POLICY "payment_methods_insert_own"
ON public.payment_methods FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own payment methods
CREATE POLICY "payment_methods_update_own"
ON public.payment_methods FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own payment methods
CREATE POLICY "payment_methods_delete_own"
ON public.payment_methods FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- TRANSACTIONS TABLE --
-- Users can only view transactions where they are the customer or creator
CREATE POLICY "transactions_select_own"
ON public.transactions FOR SELECT
TO authenticated
USING (auth.uid() = customer_id OR auth.uid() = creator_id);

-- Only service role can insert (handled by edge functions)
CREATE POLICY "transactions_insert_service"
ON public.transactions FOR INSERT
TO service_role
WITH CHECK (true);

-- CREATOR_SETTINGS TABLE --
-- Creators can only view their own settings
CREATE POLICY "creator_settings_select_own"
ON public.creator_settings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Creators can update their own settings
CREATE POLICY "creator_settings_update_own"
ON public.creator_settings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Creators can insert their own settings
CREATE POLICY "creator_settings_insert_own"
ON public.creator_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STEP 4: CREATE PUBLIC VIEW FOR SAFE PROFILE DATA
-- ============================================

-- Drop existing view if exists
DROP VIEW IF EXISTS public.public_profiles;

-- Create a view that only exposes safe fields for public viewing
CREATE VIEW public.public_profiles AS
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

-- ============================================
-- STEP 5: CREATE FUNCTION FOR SAFE CREATOR PRICING ACCESS
-- ============================================

-- Update the existing function to be more restrictive
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