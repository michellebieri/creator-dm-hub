-- Create subscription message usage tracking table
CREATE TABLE public.subscription_message_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.creator_subscriptions(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  messages_used INTEGER NOT NULL DEFAULT 0,
  messages_allowed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(subscription_id, period_start)
);

-- Enable RLS
ALTER TABLE public.subscription_message_usage ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own message usage"
ON public.subscription_message_usage
FOR SELECT
USING (auth.uid() = customer_id OR auth.uid() = creator_id);

CREATE POLICY "System can insert message usage"
ON public.subscription_message_usage
FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "System can update message usage"
ON public.subscription_message_usage
FOR UPDATE
USING (auth.uid() = customer_id);