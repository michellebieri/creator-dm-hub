import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessagePackSettings } from '@/components/MessagePackSettings';

const CreatorDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) return null;
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Creator Dashboard</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/profile-settings')}>
              Profile Settings
            </Button>
            <Button onClick={signOut}>Sign Out</Button>
          </div>
        </div>
        <MessagePackSettings />
      </div>
    </div>
  );
};

export default CreatorDashboard;
