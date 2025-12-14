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
        const { data, error } = await supabase
          .from('platform_config')
          .select('platform_owner_user_id')
          .limit(1)
          .single();

        if (error) {
          console.error('Error checking platform owner:', error);
          setIsPlatformOwner(false);
        } else {
          setIsPlatformOwner(data?.platform_owner_user_id === user.id);
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
