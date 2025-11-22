-- Allow everyone to view active bundles (for public creator profiles)
CREATE POLICY "Anyone can view active bundles"
ON content_bundles
FOR SELECT
USING (is_active = true);