import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

type AppRole = 'admin' | 'moderator' | 'creator' | 'customer';

export const useRoleCheck = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Derive role from user metadata
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const userRole = user.user_metadata?.role as AppRole;
    if (userRole) {
      setRoles([userRole]);
    }
    setLoading(false);
  }, [user]);

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
  };
};
