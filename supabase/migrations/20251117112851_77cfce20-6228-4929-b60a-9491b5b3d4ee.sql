-- Add caption and title fields to unlockables table
ALTER TABLE unlockables 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS caption TEXT;