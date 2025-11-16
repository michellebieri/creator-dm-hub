-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload to own folder in unlockables" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own content in unlockables" ON storage.objects;
DROP POLICY IF EXISTS "Public can read unlockables" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own content in unlockables" ON storage.objects;

-- Create storage policies for unlockables bucket
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own folder in unlockables"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'unlockables' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own content
CREATE POLICY "Users can read own content in unlockables"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'unlockables'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to unlockables (since bucket is public)
CREATE POLICY "Public can read unlockables"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'unlockables');

-- Allow users to delete their own content
CREATE POLICY "Users can delete own content in unlockables"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'unlockables'
  AND (storage.foldername(name))[1] = auth.uid()::text
);