-- Fix transactions table security
-- Drop the permissive INSERT policy that allows users to create transactions
DROP POLICY IF EXISTS "System can insert transactions" ON public.transactions;

-- Create a restrictive policy: Only service role can insert transactions
-- This ensures transactions can only be created by edge functions/backend
CREATE POLICY "Only service role can insert transactions"
ON public.transactions
FOR INSERT
TO service_role
WITH CHECK (true);

-- The existing SELECT policy is correct - users can view their own transactions
-- Keep: "Users can view own transactions" policy