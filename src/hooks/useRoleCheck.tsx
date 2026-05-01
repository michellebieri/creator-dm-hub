import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

type AppRole = 'admin' | 'moderator' | 'creator' | 'customer';

export const useRoleCheck = () => {
  const { user } = useAuthContext();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (userId: string) => {
    try {
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching roles:', error);
        setRoles([]);
      } else {
        setRoles(userRoles?.map((r) => r.role as AppRole) || []);
      }
    } catch (error) {
      console.error('Error in fetchRoles:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchRoles(user.id);
    } else {
      setRoles([]);
      setLoading(false);
    }
  }, [user?.id]); // only re-runs when the actual user ID changes

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = roles.includes('admin');
  const isModerator = roles.includes('moderator') || roles.includes('admin');
  const isCreator = roles.includes('creator') || roles.includes('admin');

  return {
    roles,
    hasRole,
    isAdmin,
    isModerator,
    isCreator,
    loading,
    refetch: () => user?.id ? fetchRoles(user.id) : Promise.resolve(),
  };
};
