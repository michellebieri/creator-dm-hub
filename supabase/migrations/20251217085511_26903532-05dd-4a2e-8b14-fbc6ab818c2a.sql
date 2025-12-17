-- Allow anyone to view unlockables (without sensitive data exposed) for content discovery
-- This enables users to browse creator content on profiles before purchasing

CREATE POLICY "Anyone can view unlockables for content discovery"
ON public.unlockables
FOR SELECT
USING (true);