-- Make message_id nullable on unlockables so vault uploads don't need a message record
-- Vault content (creator uploading to their own library) should be self-contained
ALTER TABLE public.unlockables
  ALTER COLUMN message_id DROP NOT NULL;

-- Add title and description columns to content_bundles if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'content_bundles'
      AND column_name = 'title'
  ) THEN
    ALTER TABLE public.content_bundles ADD COLUMN title text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'content_bundles'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE public.content_bundles ADD COLUMN description text;
  END IF;
END $$;

-- RLS: allow creators to insert bundles they own
DROP POLICY IF EXISTS "Creators can insert their own bundles" ON public.content_bundles;
CREATE POLICY "Creators can insert their own bundles"
  ON public.content_bundles
  FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- RLS: allow creators to insert bundle_contents for bundles they own
DROP POLICY IF EXISTS "Creators can insert their own bundle contents" ON public.bundle_contents;
CREATE POLICY "Creators can insert their own bundle contents"
  ON public.bundle_contents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.content_bundles cb
      WHERE cb.id = bundle_id AND cb.creator_id = auth.uid()
    )
  );

-- RLS: allow creators to insert unlockables they own (without needing a message)
DROP POLICY IF EXISTS "Creators can insert their own unlockables" ON public.unlockables;
CREATE POLICY "Creators can insert their own unlockables"
  ON public.unlockables
  FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());
