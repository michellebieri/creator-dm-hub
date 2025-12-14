-- Fix existing profiles: ensure username is set (use display_name with underscores if missing)
UPDATE profiles 
SET username = LOWER(REPLACE(REPLACE(display_name, ' ', '_'), '-', '_'))
WHERE username IS NULL OR username = '';

-- Create function to auto-generate username from display_name if not provided
CREATE OR REPLACE FUNCTION public.ensure_username()
RETURNS TRIGGER AS $$
BEGIN
  -- If username is null or empty, generate from display_name
  IF NEW.username IS NULL OR NEW.username = '' THEN
    NEW.username := LOWER(REPLACE(REPLACE(COALESCE(NEW.display_name, 'user_' || substr(NEW.id::text, 1, 8)), ' ', '_'), '-', '_'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run before insert or update
DROP TRIGGER IF EXISTS ensure_username_trigger ON profiles;
CREATE TRIGGER ensure_username_trigger
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_username();