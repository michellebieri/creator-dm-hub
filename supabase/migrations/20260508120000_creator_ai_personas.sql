-- AI Persona system for creators
-- Stores personality configuration used to power AI auto-replies and proactive outreach

CREATE TABLE IF NOT EXISTS public.creator_ai_personas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Master switches
  is_enabled BOOLEAN DEFAULT false NOT NULL,
  mode TEXT DEFAULT 'draft' NOT NULL, -- 'draft' (creator reviews) | 'auto' (sends immediately)
  auto_reply_delay_minutes INTEGER DEFAULT 10 NOT NULL, -- how long to wait before AI replies

  -- Personality capture
  tone TEXT DEFAULT 'friendly', -- 'flirty' | 'friendly' | 'playful' | 'warm' | 'professional'
  communication_style TEXT, -- free text: how they write
  common_phrases TEXT,      -- phrases/words they use often
  favorite_topics TEXT,     -- what they love talking about
  forbidden_topics TEXT,    -- what to never mention
  greeting_style TEXT,      -- how they open conversations
  free_content_response TEXT, -- what to say when fans ask for free stuff
  content_type TEXT,        -- fitness / lifestyle / gaming / art / adult etc.
  upsell_aggressiveness TEXT DEFAULT 'moderate', -- 'light' | 'moderate' | 'active'
  custom_instructions TEXT, -- anything else the creator wants the AI to know

  -- Proactive outreach
  proactive_outreach_enabled BOOLEAN DEFAULT false NOT NULL,
  proactive_outreach_delay_days INTEGER DEFAULT 3 NOT NULL, -- days of silence before reaching out

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.creator_ai_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_persona_select_own" ON public.creator_ai_personas
  FOR SELECT USING (creator_id = auth.uid());

CREATE POLICY "ai_persona_insert_own" ON public.creator_ai_personas
  FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "ai_persona_update_own" ON public.creator_ai_personas
  FOR UPDATE USING (creator_id = auth.uid());

-- Log of AI-initiated proactive outreach (prevents spamming)
CREATE TABLE IF NOT EXISTS public.ai_outreach_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  fan_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  fan_responded BOOLEAN DEFAULT false NOT NULL
);

ALTER TABLE public.ai_outreach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_outreach_log_creator" ON public.ai_outreach_log
  FOR SELECT USING (creator_id = auth.uid());

-- Index for efficient lookup
CREATE INDEX idx_ai_outreach_log_creator_fan ON public.ai_outreach_log(creator_id, fan_id, sent_at DESC);

-- Draft AI messages (mode='draft' — creator reviews before sending)
CREATE TABLE IF NOT EXISTS public.ai_draft_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  draft_content TEXT NOT NULL,
  trigger_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending' | 'sent' | 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_draft_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_drafts_creator_own" ON public.ai_draft_messages
  FOR ALL USING (creator_id = auth.uid());

CREATE INDEX idx_ai_drafts_creator_pending ON public.ai_draft_messages(creator_id, status) WHERE status = 'pending';
