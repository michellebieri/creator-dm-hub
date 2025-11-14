-- Add forwarded message tracking
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS forwarded_from_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN NOT NULL DEFAULT false;

-- Create index for forwarded messages
CREATE INDEX IF NOT EXISTS idx_messages_forwarded_from ON public.messages(forwarded_from_id);