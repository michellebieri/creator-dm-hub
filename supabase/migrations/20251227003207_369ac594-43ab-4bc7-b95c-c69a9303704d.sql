-- Fix storage exposure: Only drop the public policy (other policies already exist)

-- Drop the overly permissive public read policy - this is the critical fix
DROP POLICY IF EXISTS "Public read access for unlockables" ON storage.objects;