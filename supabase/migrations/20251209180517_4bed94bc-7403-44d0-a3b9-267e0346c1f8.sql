-- Add INSERT policy for creator_subscriptions (the missing one)
CREATE POLICY "Users can create own subscriptions"
ON public.creator_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = customer_id);