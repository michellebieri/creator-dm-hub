-- Make unlockables bucket public so thumbnails can be displayed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'unlockables';

-- Ensure RLS policies allow public read access
CREATE POLICY "Public read access for unlockables" ON storage.objects
FOR SELECT USING (bucket_id = 'unlockables');

-- Allow authenticated users to upload to their folder
DROP POLICY IF EXISTS "Users can upload to their folder" ON storage.objects;
CREATE POLICY "Users can upload to their folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'unlockables' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own files
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
CREATE POLICY "Users can update their own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'unlockables' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'unlockables' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);