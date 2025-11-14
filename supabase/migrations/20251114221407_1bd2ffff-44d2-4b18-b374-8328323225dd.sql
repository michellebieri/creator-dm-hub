-- Create scheduled_messages table
CREATE TABLE public.scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  message_type TEXT NOT NULL DEFAULT 'text',
  voice_url TEXT,
  voice_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Creators can view their own scheduled messages
CREATE POLICY "Creators can view own scheduled messages"
ON public.scheduled_messages
FOR SELECT
USING (auth.uid() = sender_id);

-- Creators can create scheduled messages
CREATE POLICY "Creators can create scheduled messages"
ON public.scheduled_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = scheduled_messages.conversation_id
    AND c.creator_id = auth.uid()
  )
);

-- Creators can update their own scheduled messages (to cancel)
CREATE POLICY "Creators can update own scheduled messages"
ON public.scheduled_messages
FOR UPDATE
USING (auth.uid() = sender_id);

-- Creators can delete their own scheduled messages
CREATE POLICY "Creators can delete own scheduled messages"
ON public.scheduled_messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Create index for efficient queries
CREATE INDEX idx_scheduled_messages_scheduled_at ON public.scheduled_messages(scheduled_at, status);
CREATE INDEX idx_scheduled_messages_sender_id ON public.scheduled_messages(sender_id);