-- Fix 1: Create the missing rate_limits table for rate limiting infrastructure
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for efficient lookups
CREATE INDEX idx_rate_limits_user_endpoint ON public.rate_limits(user_id, endpoint, window_start);
CREATE INDEX idx_rate_limits_ip_endpoint ON public.rate_limits(ip_address, endpoint, window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage rate limits (edge functions use service role)
CREATE POLICY "Service role manages rate limits" 
  ON public.rate_limits 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Fix 2: Remove overly permissive platform config policy and create safe view
DROP POLICY IF EXISTS "Anyone can read platform config" ON public.platform_config;

-- Create safe view that only exposes platform_fee_percentage
CREATE OR REPLACE VIEW public.platform_public_config 
WITH (security_invoker = true) AS
SELECT 
  platform_fee_percentage
FROM public.platform_config
LIMIT 1;

-- Grant access to the safe view
GRANT SELECT ON public.platform_public_config TO anon, authenticated;