import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AutoReplyManager } from '@/components/AutoReplyManager';

export default function AutoReplies() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Auto-Replies</h1>
          <p className="text-muted-foreground">
            Automatically respond to messages when you're offline or busy
          </p>
        </div>

        {user?.id && <AutoReplyManager creatorId={user.id} />}
      </div>
    </div>
  );
}
