-- Create content tags table
CREATE TABLE IF NOT EXISTS public.content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create content tag assignments table
CREATE TABLE IF NOT EXISTS public.content_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unlockable_id UUID NOT NULL REFERENCES public.unlockables(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.content_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(unlockable_id, tag_id)
);

-- Create creator verification table
CREATE TABLE IF NOT EXISTS public.creator_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  verified_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  documents_url TEXT,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_tags
CREATE POLICY "Anyone can view tags"
  ON public.content_tags FOR SELECT
  USING (true);

CREATE POLICY "Creators can create tags"
  ON public.content_tags FOR INSERT
  WITH CHECK (true);

-- RLS Policies for content_tag_assignments
CREATE POLICY "Anyone can view tag assignments"
  ON public.content_tag_assignments FOR SELECT
  USING (true);

CREATE POLICY "Creators can manage own content tags"
  ON public.content_tag_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.unlockables u
      WHERE u.id = content_tag_assignments.unlockable_id
      AND u.creator_id = auth.uid()
    )
  );

-- RLS Policies for creator_verifications
CREATE POLICY "Creators can view own verification"
  ON public.creator_verifications FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can submit verification"
  ON public.creator_verifications FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own pending verification"
  ON public.creator_verifications FOR UPDATE
  USING (auth.uid() = creator_id AND status = 'pending');