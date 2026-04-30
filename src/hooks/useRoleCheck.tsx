import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'moderator' | 'creator' | 'customer';

export const useRoleCheck = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (userId: string | undefined) => {
    if (!userId) {
      setRoles([]);
      setLoading(false);
      return;
    }

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
    // Subscribe to auth changes and re-fetch roles whenever the user changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchRoles(session?.user?.id);
    });

    // Also fetch for the current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchRoles(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    refetch: () => supabase.auth.getSession().then(({ data: { session } }) => fetchRoles(session?.user?.id)),
  };
};
