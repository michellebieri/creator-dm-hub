-- Allow anyone to view creator settings (for public profile data like social links)
CREATE POLICY "Public can view creator settings" 
ON public.creator_settings 
FOR SELECT 
USING (true);