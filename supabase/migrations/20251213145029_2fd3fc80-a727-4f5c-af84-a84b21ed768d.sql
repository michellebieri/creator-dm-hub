-- Fix unlockables storage bucket: Remove public access, add purchase-based access

-- Drop any existing public read policies on storage.objects for unlockables bucket
DROP POLICY IF EXISTS "Public can read unlockables" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view unlockables" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Ensure bucket is private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'unlockables';

-- Create policy: Creators can view their own uploaded content
CREATE POLICY "Creators can view own unlockables"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'unlockables'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy: Purchasers can view content they have unlocked
CREATE POLICY "Purchasers can view unlocked content"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'unlockables'
  AND EXISTS (
    SELECT 1 FROM public.unlockables u
    WHERE u.media_url LIKE '%' || storage.filename(name) || '%'
    AND auth.uid() = ANY(u.unlocked_by)
  )
);

-- Keep existing upload policy for creators (if not exists, create it)
DROP POLICY IF EXISTS "Creators can upload unlockables" ON storage.objects;
CREATE POLICY "Creators can upload unlockables"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'unlockables'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Creators can update their own uploads
DROP POLICY IF EXISTS "Creators can update own unlockables" ON storage.objects;
CREATE POLICY "Creators can update own unlockables"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'unlockables'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Creators can delete their own uploads
DROP POLICY IF EXISTS "Creators can delete own unlockables" ON storage.objects;
CREATE POLICY "Creators can delete own unlockables"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'unlockables'
  AND (storage.foldername(name))[1] = auth.uid()::text
);