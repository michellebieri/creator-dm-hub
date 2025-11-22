-- Allow authenticated users to view bundle contents
-- This is needed so customers can see what's in a bundle before purchasing
CREATE POLICY "Anyone can view bundle contents"
ON bundle_contents
FOR SELECT
TO authenticated
USING (true);