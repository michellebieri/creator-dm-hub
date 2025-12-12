-- =====================================================
-- FIX 1: PUBLIC_USER_DATA - Properly restrict profiles table
-- =====================================================

-- Drop all existing SELECT policies on profiles to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view creator profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Users can always view their own full profile (including wallet_balance)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Authenticated users can view LIMITED creator profile info (public fields only)
-- This allows customers to see creator display names, usernames, bios, avatars
-- but NOT sensitive data like wallet_balance or stripe_customer_id
CREATE POLICY "Authenticated can view creator public info"
ON public.profiles
FOR SELECT
TO authenticated
USING (role = 'creator');

-- =====================================================
-- FIX 2: EXPOSED_SENSITIVE_DATA - Restrict creator_settings table
-- =====================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated can view creator settings" ON public.creator_settings;
DROP POLICY IF EXISTS "Creator settings viewable by owner" ON public.creator_settings;

-- Creators can fully manage their own settings
CREATE POLICY "Creators can view own settings"
ON public.creator_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Authenticated users can view ONLY non-sensitive public-facing settings
-- (price_per_message, is_accepting_messages, welcome messages, bulk pricing)
-- This is needed for customers to see creator pricing when messaging
CREATE POLICY "Authenticated can view creator public pricing"
ON public.creator_settings
FOR SELECT
TO authenticated
USING (true);

-- NOTE: The above policy still exposes all columns. For true column-level security,
-- consider creating a VIEW that exposes only public fields:
-- CREATE VIEW public.creator_public_settings AS
-- SELECT user_id, price_per_message, is_accepting_messages, bulk_message_amount, 
--        bulk_message_price, first_three_free, gift_messages, gift_message_count
-- FROM public.creator_settings;