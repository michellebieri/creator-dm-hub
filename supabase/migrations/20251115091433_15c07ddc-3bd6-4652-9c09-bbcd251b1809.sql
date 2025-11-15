-- Enable RLS on processed_webhook_events table
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role has full access"
ON public.processed_webhook_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);