-- Create table to track processed webhook events for idempotency
CREATE TABLE public.processed_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX idx_processed_webhook_events_event_id ON public.processed_webhook_events(event_id);
CREATE INDEX idx_processed_webhook_events_created_at ON public.processed_webhook_events(created_at);

-- No RLS needed as this table is only accessed by edge functions with service role