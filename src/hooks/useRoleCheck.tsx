import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'moderator' | 'creator' | 'customer';

export const useRoleCheck = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      // Fetch roles from user_roles table
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching roles:', error);
        setRoles([]);
      } else {
        setRoles(userRoles?.map(r => r.role as AppRole) || []);
      }
    } catch (error) {
      console.error('Error in fetchRoles:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

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
    refetch: fetchRoles,
  };
};
