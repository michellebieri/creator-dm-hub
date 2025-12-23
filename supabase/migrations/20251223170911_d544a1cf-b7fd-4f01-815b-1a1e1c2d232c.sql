-- Add thumbnail_url column to unlockables table for video thumbnails
ALTER TABLE public.unlockables 
ADD COLUMN IF NOT EXISTS thumbnail_url text;