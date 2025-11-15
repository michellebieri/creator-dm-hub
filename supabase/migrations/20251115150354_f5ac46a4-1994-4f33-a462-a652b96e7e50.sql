-- Update the handle_new_user function to insert into both profiles and user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  user_role_value public.user_role;
  app_role_value public.app_role;
BEGIN
  -- Determine the role from metadata, default to 'customer'
  user_role_value := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'customer');
  
  -- Insert into profiles table
  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
    user_role_value
  );
  
  -- Convert user_role to app_role and insert into user_roles table
  IF user_role_value = 'creator' THEN
    app_role_value := 'creator';
  ELSE
    app_role_value := 'customer';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, app_role_value);
  
  RETURN NEW;
END;
$$;