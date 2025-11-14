-- Create labels table
CREATE TABLE public.conversation_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create junction table for conversation-label relationship
CREATE TABLE public.conversation_label_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.conversation_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, label_id)
);

-- Enable RLS
ALTER TABLE public.conversation_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_label_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for labels
CREATE POLICY "Users can view own labels"
ON public.conversation_labels
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own labels"
ON public.conversation_labels
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own labels"
ON public.conversation_labels
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own labels"
ON public.conversation_labels
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for label assignments
CREATE POLICY "Users can view label assignments for their conversations"
ON public.conversation_label_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_label_assignments.conversation_id
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  )
);

CREATE POLICY "Users can create label assignments for their conversations"
ON public.conversation_label_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_label_assignments.conversation_id
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  )
);

CREATE POLICY "Users can delete label assignments for their conversations"
ON public.conversation_label_assignments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_label_assignments.conversation_id
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  )
);

-- Create indexes
CREATE INDEX idx_conversation_labels_user_id ON public.conversation_labels(user_id);
CREATE INDEX idx_conversation_label_assignments_conversation_id ON public.conversation_label_assignments(conversation_id);
CREATE INDEX idx_conversation_label_assignments_label_id ON public.conversation_label_assignments(label_id);