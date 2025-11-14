-- Create auto_replies table for creator automated responses
CREATE TABLE IF NOT EXISTS public.auto_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  trigger_condition TEXT NOT NULL DEFAULT 'always',
  schedule_start TIME,
  schedule_end TIME,
  days_active TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auto_replies ENABLE ROW LEVEL SECURITY;

-- Creators can manage own auto-replies
CREATE POLICY "Creators can view own auto-replies"
  ON public.auto_replies FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can create own auto-replies"
  ON public.auto_replies FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own auto-replies"
  ON public.auto_replies FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own auto-replies"
  ON public.auto_replies FOR DELETE
  USING (auth.uid() = creator_id);

-- Add trigger for updated_at
CREATE TRIGGER update_auto_replies_updated_at
  BEFORE UPDATE ON public.auto_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_auto_replies_creator ON public.auto_replies(creator_id) WHERE is_active = true;