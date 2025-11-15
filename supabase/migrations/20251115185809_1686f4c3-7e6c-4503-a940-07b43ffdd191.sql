-- Allow anyone to view creator roles (public information)
CREATE POLICY "Anyone can view creator roles"
ON user_roles
FOR SELECT
USING (role = 'creator');