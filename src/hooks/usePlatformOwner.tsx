import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const usePlatformOwner = () => {
  const { user } = useAuth();
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPlatformOwner = async () => {
      if (!user) {
        setIsPlatformOwner(false);
        setLoading(false);
        return;
      }

      try {
        // Use secure RPC function to check platform owner status
        // This doesn't expose the actual platform_owner_user_id
        const { data, error } = await supabase.rpc('check_is_platform_owner');

        if (error) {
          console.error('Error checking platform owner:', error);
          setIsPlatformOwner(false);
        } else {
          setIsPlatformOwner(data === true);
        }
      } catch (error) {
        console.error('Error in platform owner check:', error);
        setIsPlatformOwner(false);
      } finally {
        setLoading(false);
      }
    };

    checkPlatformOwner();
  }, [user]);

  return { isPlatformOwner, loading };
};
