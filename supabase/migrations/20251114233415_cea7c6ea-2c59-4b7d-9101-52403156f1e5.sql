-- Create content_bundles table for grouping multiple unlockables
CREATE TABLE IF NOT EXISTS public.content_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  discount_percentage NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create junction table for bundle content
CREATE TABLE IF NOT EXISTS public.bundle_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.content_bundles(id) ON DELETE CASCADE,
  unlockable_id UUID NOT NULL REFERENCES public.unlockables(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bundle_id, unlockable_id)
);

-- Enable RLS
ALTER TABLE public.content_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_contents ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_bundles
CREATE POLICY "Creators can view own bundles"
  ON public.content_bundles FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can create own bundles"
  ON public.content_bundles FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own bundles"
  ON public.content_bundles FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own bundles"
  ON public.content_bundles FOR DELETE
  USING (auth.uid() = creator_id);

-- RLS policies for bundle_contents
CREATE POLICY "Users can view bundle contents"
  ON public.bundle_contents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.content_bundles
      WHERE id = bundle_contents.bundle_id
      AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Creators can manage bundle contents"
  ON public.bundle_contents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.content_bundles
      WHERE id = bundle_contents.bundle_id
      AND creator_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_content_bundles_updated_at
  BEFORE UPDATE ON public.content_bundles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes
CREATE INDEX idx_content_bundles_creator ON public.content_bundles(creator_id) WHERE is_active = true;
CREATE INDEX idx_bundle_contents_bundle ON public.bundle_contents(bundle_id);
CREATE INDEX idx_bundle_contents_unlockable ON public.bundle_contents(unlockable_id);