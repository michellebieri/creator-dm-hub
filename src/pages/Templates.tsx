import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageTemplateManager } from '@/components/MessageTemplateManager';
import { ArrowLeft } from 'lucide-react';

const Templates = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {user && (
          <MessageTemplateManager
            creatorId={user.id}
            onClose={() => navigate('/dashboard')}
          />
        )}
      </div>
    </div>
  );
};

export default Templates;
