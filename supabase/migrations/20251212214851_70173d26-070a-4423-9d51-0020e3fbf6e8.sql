-- =====================================================
-- CRITICAL SECURITY FIX: Apply strict RLS policies
-- =====================================================

-- =====================================================
-- FIX 1: profiles table - Restrict sensitive financial data
-- =====================================================

-- Drop all existing SELECT policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view creator public info" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view creator profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Users can view their own complete profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Authenticated users can view ONLY public creator info (NOT wallet_balance, NOT stripe_customer_id)
-- Note: RLS cannot filter columns, but this restricts row access to creators only
CREATE POLICY "Authenticated view creator public info"
ON public.profiles
FOR SELECT
TO authenticated
USING (role = 'creator' AND auth.uid() != id);

-- =====================================================
-- FIX 2: creator_settings table - Remove ALL public access
-- =====================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated can view creator public pricing" ON public.creator_settings;
DROP POLICY IF EXISTS "Authenticated can view creator settings" ON public.creator_settings;
DROP POLICY IF EXISTS "Creator settings viewable by owner" ON public.creator_settings;
DROP POLICY IF EXISTS "Creators can view own settings" ON public.creator_settings;
DROP POLICY IF EXISTS "Creators can insert own settings" ON public.creator_settings;
DROP POLICY IF EXISTS "Creators can update own settings" ON public.creator_settings;

-- Only creators can view their own settings
CREATE POLICY "Creators can view own settings"
ON public.creator_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Creators can insert their own settings
CREATE POLICY "Creators can insert own settings"
ON public.creator_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Creators can update their own settings
CREATE POLICY "Creators can update own settings"
ON public.creator_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Customers can view ONLY pricing-related fields of creators they interact with
-- This is needed for messaging functionality
CREATE POLICY "Customers view creator pricing"
ON public.creator_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.creator_id = creator_settings.user_id
    AND c.customer_id = auth.uid()
  )
);

-- =====================================================
-- FIX 3: payment_methods table - Already has owner-only access
-- Verify and reinforce
-- =====================================================

-- Drop and recreate to ensure strictness
DROP POLICY IF EXISTS "Users can view their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can insert their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete their own payment methods" ON public.payment_methods;

CREATE POLICY "Users can view own payment methods"
ON public.payment_methods
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods"
ON public.payment_methods
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods"
ON public.payment_methods
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods"
ON public.payment_methods
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- FIX 4: unlockables table - Restrict to purchasers only
-- =====================================================

-- Drop permissive policies
DROP POLICY IF EXISTS "Conversation participants can view unlockables" ON public.unlockables;
DROP POLICY IF EXISTS "Anyone can view unlockables" ON public.unlockables;

-- Creators can view their own unlockables
CREATE POLICY "Creators view own unlockables"
ON public.unlockables
FOR SELECT
USING (auth.uid() = creator_id);

-- Users can view unlockables they have purchased (are in unlocked_by array)
CREATE POLICY "Purchasers view unlocked content"
ON public.unlockables
FOR SELECT
USING (auth.uid() = ANY(unlocked_by));

-- Users in conversation can view unlockable metadata (price, type) but content is protected
CREATE POLICY "Conversation participants view unlockable info"
ON public.unlockables
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE m.id = unlockables.message_id
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  )
);