-- Enable RLS on unlockables table if not already enabled
ALTER TABLE unlockables ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view all unlockables (for browsing creator profiles)
CREATE POLICY "Anyone can view unlockables"
ON unlockables
FOR SELECT
TO authenticated, anon
USING (true);

-- Allow creators to insert their own unlockables
CREATE POLICY "Creators can insert own unlockables"
ON unlockables
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- Allow creators to update their own unlockables
CREATE POLICY "Creators can update own unlockables"
ON unlockables
FOR UPDATE
TO authenticated
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);

-- Allow creators to delete their own unlockables
CREATE POLICY "Creators can delete own unlockables"
ON unlockables
FOR DELETE
TO authenticated
USING (auth.uid() = creator_id);

-- Allow users to update unlocked_by array when they purchase content
CREATE POLICY "Users can update unlocked_by when purchasing"
ON unlockables
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  auth.uid() = ANY(unlocked_by)
);