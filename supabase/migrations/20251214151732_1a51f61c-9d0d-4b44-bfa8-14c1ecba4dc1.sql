-- Platform configuration table
CREATE TABLE IF NOT EXISTS public.platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_fee_percentage numeric NOT NULL DEFAULT 20.00,
  platform_stripe_account_id text,
  platform_owner_user_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Platform fees tracking table
CREATE TABLE IF NOT EXISTS public.platform_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id),
  creator_id uuid NOT NULL REFERENCES public.profiles(id),
  gross_amount numeric NOT NULL,
  platform_fee_amount numeric NOT NULL,
  creator_net_amount numeric NOT NULL,
  stripe_transfer_id text,
  stripe_application_fee_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;

-- Platform config policies (only platform owner can view/manage)
CREATE POLICY "Platform owner can view config"
  ON public.platform_config FOR SELECT
  USING (platform_owner_user_id = auth.uid());

CREATE POLICY "Platform owner can update config"
  ON public.platform_config FOR UPDATE
  USING (platform_owner_user_id = auth.uid());

-- Platform fees policies
CREATE POLICY "Creators can view their own fees"
  ON public.platform_fees FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Platform owner can view all fees"
  ON public.platform_fees FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.platform_config
    WHERE platform_owner_user_id = auth.uid()
  ));

CREATE POLICY "System can insert platform fees"
  ON public.platform_fees FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update platform fees"
  ON public.platform_fees FOR UPDATE
  USING (true);

-- Add stripe_connect_status to creator_settings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'creator_settings' 
    AND column_name = 'stripe_connect_status'
  ) THEN
    ALTER TABLE public.creator_settings 
    ADD COLUMN stripe_connect_status text DEFAULT 'not_connected';
  END IF;
END $$;

-- Insert default platform config (will be updated with actual values later)
INSERT INTO public.platform_config (platform_fee_percentage)
VALUES (20.00)
ON CONFLICT DO NOTHING;