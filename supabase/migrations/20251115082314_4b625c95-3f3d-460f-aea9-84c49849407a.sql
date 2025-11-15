-- Create email preferences table
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  new_message BOOLEAN DEFAULT true,
  new_subscriber BOOLEAN DEFAULT true,
  new_purchase BOOLEAN DEFAULT true,
  new_tip BOOLEAN DEFAULT true,
  new_comment BOOLEAN DEFAULT true,
  new_follower BOOLEAN DEFAULT true,
  promotional BOOLEAN DEFAULT false,
  weekly_summary BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create activity feed table
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('message', 'purchase', 'subscription', 'tip', 'comment', 'follow', 'content_upload')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_preferences
CREATE POLICY "Users can view own email preferences"
  ON public.email_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email preferences"
  ON public.email_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email preferences"
  ON public.email_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for activity_feed
CREATE POLICY "Users can view own activity feed"
  ON public.activity_feed FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity feed"
  ON public.activity_feed FOR INSERT
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_activity_feed_user_created ON public.activity_feed(user_id, created_at DESC);

-- Create trigger for email_preferences updated_at
CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();