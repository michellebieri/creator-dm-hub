-- Add pinning functionality to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for pinned messages
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON public.messages(conversation_id, is_pinned, pinned_at DESC) WHERE is_pinned = true;