import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireCreator?: boolean;
  requireCustomer?: boolean;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireCreator = false,
  requireCustomer = false,
  requireAdmin = false,
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isCreator, isAdmin, loading: roleLoading } = useRoleCheck();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || roleLoading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    if (requireAdmin && !isAdmin) {
      navigate('/');
      return;
    }

    if (requireCreator && !isCreator) {
      navigate('/dashboard');
      return;
    }

    if (requireCustomer && isCreator) {
      navigate('/dashboard');
      return;
    }
  }, [user, isCreator, isAdmin, authLoading, roleLoading, navigate, requireCreator, requireCustomer, requireAdmin]);

  if (authLoading || roleLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return null;
  }

  if (requireCreator && !isCreator) {
    return null;
  }

  if (requireCustomer && isCreator) {
    return null;
  }

  return <>{children}</>;
};
