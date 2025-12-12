-- =====================================================
-- COMPREHENSIVE SECURITY FIX: Restrict public access to sensitive tables
-- =====================================================

-- 1. Fix content_likes table - restrict to creator, liker, or content owner
DROP POLICY IF EXISTS "Users can view likes" ON public.content_likes;

CREATE POLICY "Users can view relevant likes"
ON public.content_likes
FOR SELECT
USING (
  auth.uid() = user_id OR  -- User can see their own likes
  EXISTS (
    SELECT 1 FROM public.unlockables u
    WHERE u.id = content_likes.unlockable_id
    AND u.creator_id = auth.uid()  -- Creator can see likes on their content
  )
);

-- 2. Fix content_bundles table - restrict to creator or authenticated users
DROP POLICY IF EXISTS "Active bundles visible to all" ON public.content_bundles;
DROP POLICY IF EXISTS "Anyone can view active bundles" ON public.content_bundles;

-- Creators can manage their own bundles (existing policy should remain)
-- Add policy for authenticated users to view active bundles
CREATE POLICY "Authenticated users can view active bundles"
ON public.content_bundles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND is_active = true
);