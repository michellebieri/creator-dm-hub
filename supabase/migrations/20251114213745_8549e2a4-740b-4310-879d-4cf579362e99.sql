-- Create unlockables storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('unlockables', 'unlockables', false)
ON CONFLICT (id) DO NOTHING;

-- Create policies for unlockables bucket
CREATE POLICY "Creators can upload unlockables"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'unlockables' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Creators can update own unlockables"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'unlockables' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Authenticated users can view unlockables"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'unlockables'
  AND auth.role() = 'authenticated'
);