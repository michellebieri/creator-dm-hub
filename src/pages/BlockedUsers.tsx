import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Ban, Unlock, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

interface BlockedUser {
  id: string;
  blocked_id: string;
  user_name: string;
  user_username: string;
  user_avatar: string | null;
  blocked_at: string;
}

const BlockedUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchBlockedUsers();
    }
  }, [user]);

  const fetchBlockedUsers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select(`
          id,
          blocked_id,
          created_at
        `)
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get blocked user profiles
      const blockedIds = data?.map(b => b.blocked_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', blockedIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const formatted = data?.map(block => {
        const profile = profileMap.get(block.blocked_id);
        return {
          id: block.id,
          blocked_id: block.blocked_id,
          user_name: profile?.display_name || 'Unknown',
          user_username: profile?.username || 'unknown',
          user_avatar: profile?.avatar_url || null,
          blocked_at: block.created_at,
        };
      }) || [];

      setBlockedUsers(formatted);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      toast.error('Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockId: string, userName: string) => {
    setUnblocking(blockId);
    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      toast.success(`${userName} has been unblocked`);
      fetchBlockedUsers();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user');
    } finally {
      setUnblocking(null);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Blocked Users</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="container mx-auto p-6 max-w-4xl">

      {blockedUsers.length === 0 ? (
        <EmptyState
          icon={Ban}
          title="No Blocked Users"
          description="You haven't blocked anyone yet"
        />
      ) : (
        <div className="grid gap-4">
          {blockedUsers.map((blocked) => (
            <Card key={blocked.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={blocked.user_avatar || ''} />
                      <AvatarFallback>{blocked.user_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{blocked.user_name}</h3>
                      <p className="text-sm text-muted-foreground">@{blocked.user_username}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnblock(blocked.id, blocked.user_name)}
                    disabled={unblocking === blocked.id}
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    {unblocking === blocked.id ? 'Unblocking...' : 'Unblock'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default BlockedUsers;
