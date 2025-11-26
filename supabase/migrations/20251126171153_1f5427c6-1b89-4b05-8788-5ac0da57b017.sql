-- Add bundle_id column to transactions table for content bundle purchases
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS bundle_id uuid REFERENCES public.content_bundles(id);

-- Create index for bundle lookups
CREATE INDEX IF NOT EXISTS idx_transactions_bundle_id ON public.transactions(bundle_id);