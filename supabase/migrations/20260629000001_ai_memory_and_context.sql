-- AI Memory & Context System
-- Deployed automatically via GitHub Actions on push to main

-- 1. Add weekly context + featured content to AI persona
ALTER TABLE public.creator_ai_personas
  ADD COLUMN IF NOT EXISTS weekly_context TEXT,
  ADD COLUMN IF NOT EXISTS featured_content JSONB DEFAULT '[]'::jsonb;

-- 2. Fan memories table
CREATE TABLE IF NOT EXISTS public.fan_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('interest', 'personal_fact', 'life_event')),
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  source_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(creator_id, fan_id, memory_key)
);

ALTER TABLE public.fan_memories ENABLE ROW LEVEL SECURITY;

-- Creators can read and delete memories about their fans
CREATE POLICY "fan_memories_creator_select" ON public.fan_memories
  FOR SELECT USING (creator_id = auth.uid());
CREATE POLICY "fan_memories_creator_delete" ON public.fan_memories
  FOR DELETE USING (creator_id = auth.uid());

GRANT SELECT, DELETE ON public.fan_memories TO authenticated;
GRANT ALL ON public.fan_memories TO service_role;

CREATE INDEX idx_fan_memories_creator_fan ON public.fan_memories(creator_id, fan_id);
