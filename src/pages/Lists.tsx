import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Follower {
  id: string;
  follower_id: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

const Lists = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFollowers();
      
      // Set up realtime subscription
      const channel = supabase
        .channel('followers-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_follows',
            filter: `following_id=eq.${user.id}`
          },
          () => {
            fetchFollowers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchFollowers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select(`
          id,
          follower_id,
          created_at,
          profiles!user_follows_follower_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('following_id', user.id)
        .neq('follower_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFollowers(data || []);
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoading(false);
    }
  };

  const defaultLists = [
    { name: `All followers (${followers.length})`, path: '#', active: true },
    { name: 'Paying followers (0)', path: '#', active: false },
    { name: 'Non-paying followers (0)', path: '#', active: false },
    { name: 'All subscribers (0)', path: '/subscriptions', active: false },
    { name: 'Lost subscribers (0)', path: '#', active: false },
    { name: 'Other customers (0)', path: '#', active: false },
    { name: '$100+ spenders (0)', path: '#', active: false },
    { name: '$1000+ spenders (0)', path: '#', active: false },
    { name: 'Avoid sending mass messages (0)', path: '#', active: false },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Followers & Subscribers</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto">
        {/* Followers Section - Primary View */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-primary">Followers ({followers.length})</h2>
          </div>

          {loading ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">Loading followers...</p>
            </Card>
          ) : followers.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">No followers yet. Share your profile to get followers!</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {followers.map((follower) => (
                <Card key={follower.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={follower.profiles?.avatar_url || ''} />
                      <AvatarFallback>
                        {follower.profiles?.display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{follower.profiles?.display_name}</p>
                      <p className="text-sm text-muted-foreground">@{follower.profiles?.username}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Followed {formatDistanceToNow(new Date(follower.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Filters Section */}
        <div className="px-4 py-3 mt-6">
          <p className="text-xs font-bold text-primary uppercase tracking-wider">Filter Options</p>
        </div>

        <div className="px-4 space-y-2">
          {defaultLists.map((list, index) => (
            <button
              key={index}
              onClick={() => list.path !== '#' && navigate(list.path)}
              className={`flex items-center justify-between w-full px-4 py-3 ${
                list.active
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-card border-border hover:bg-muted/50'
              } transition-colors rounded-lg border`}
            >
              <span className={`text-base ${list.active ? 'font-semibold text-primary' : 'font-normal'}`}>{list.name}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Lists;
