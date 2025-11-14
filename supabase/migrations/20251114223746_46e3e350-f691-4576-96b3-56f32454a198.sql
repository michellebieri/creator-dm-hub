-- Add edit functionality to messages table
ALTER TABLE public.messages
ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN edit_count INTEGER DEFAULT 0;

-- Create index for efficient queries
CREATE INDEX idx_messages_edited_at ON public.messages(edited_at) WHERE edited_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.messages.edited_at IS 'Timestamp of last edit';
COMMENT ON COLUMN public.messages.edit_count IS 'Number of times message has been edited';