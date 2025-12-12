-- Fix user_follows table - restrict SELECT to only follower or following user
DROP POLICY IF EXISTS "Users can view follows" ON public.user_follows;

CREATE POLICY "Users can view own follows"
ON public.user_follows
FOR SELECT
USING (
  auth.uid() = follower_id OR 
  auth.uid() = following_id
);