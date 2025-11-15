import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireCreator?: boolean;
  requireCustomer?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireCreator = false,
  requireCustomer = false 
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isCreator, loading: roleLoading } = useRoleCheck();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || roleLoading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    if (requireCreator && !isCreator) {
      navigate('/browse');
      return;
    }

    if (requireCustomer && isCreator) {
      navigate('/dashboard');
      return;
    }
  }, [user, isCreator, authLoading, roleLoading, navigate, requireCreator, requireCustomer]);

  if (authLoading || roleLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
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
