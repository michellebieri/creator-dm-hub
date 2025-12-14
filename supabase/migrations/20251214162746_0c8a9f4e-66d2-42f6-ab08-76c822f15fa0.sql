-- Allow authenticated users to read platform_config (needed to check if they're the platform owner)
CREATE POLICY "Anyone can read platform config" ON platform_config
FOR SELECT USING (true);