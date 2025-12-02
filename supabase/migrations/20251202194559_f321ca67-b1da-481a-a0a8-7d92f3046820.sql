-- Add free_for_subscribers column to unlockables table
ALTER TABLE public.unlockables 
ADD COLUMN IF NOT EXISTS free_for_subscribers boolean DEFAULT false;

-- Create index for efficient subscriber-only content queries
CREATE INDEX IF NOT EXISTS idx_unlockables_free_for_subscribers 
ON public.unlockables(creator_id, free_for_subscribers) 
WHERE free_for_subscribers = true;