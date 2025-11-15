-- Update storage policy to allow anyone to view files in the unlockables bucket
DROP POLICY IF EXISTS "Authenticated users can view unlockables" ON storage.objects;

CREATE POLICY "Anyone can view unlockables"
ON storage.objects
FOR SELECT
USING (bucket_id = 'unlockables');