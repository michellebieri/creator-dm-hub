-- Create message bookmarks table
CREATE TABLE public.message_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);

-- Enable RLS
ALTER TABLE public.message_bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own bookmarks"
  ON public.message_bookmarks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookmarks"
  ON public.message_bookmarks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON public.message_bookmarks
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks"
  ON public.message_bookmarks
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_message_bookmarks_user_id ON public.message_bookmarks(user_id);
CREATE INDEX idx_message_bookmarks_created_at ON public.message_bookmarks(created_at DESC);

-- Add comment
COMMENT ON TABLE public.message_bookmarks IS 'Stores user bookmarks for important messages';