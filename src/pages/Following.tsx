import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Heart, Search, UserMinus, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Following {
  id: string;
  following_id: string;
  creator_name: string;
  creator_username: string;
  creator_avatar: string | null;
  creator_bio: string | null;
  followed_at: string;
}

const Following = () => {
  const { user } = useAuth();
  const { isCreator } = useRoleCheck();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Following[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [unfollowing, setUnfollowing] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchFollowing();
    }
  }, [user]);

  const fetchFollowing = async () => {
    if (!user) return;

    try {
      // If creator, fetch followers. If customer, fetch following
      const query = isCreator
        ? supabase
            .from('user_follows')
            .select(`
              id,
              follower_id,
              created_at
            `)
            .eq('following_id', user.id)
        : supabase
            .from('user_follows')
            .select(`
              id,
              following_id,
              created_at
            `)
            .eq('follower_id', user.id);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles - either followers or following based on user type
      const profileIds = isCreator 
        ? data?.map(f => f.follower_id) || []
        : data?.map(f => f.following_id) || [];
        
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, bio')
        .in('id', profileIds);

      const profileMap = new Map(profiles?.map(c => [c.id, c]) || []);

      const formatted = data?.map(follow => {
        const profileId = isCreator ? follow.follower_id : follow.following_id;
        const profile = profileMap.get(profileId);
        return {
          id: follow.id,
          following_id: profileId,
          creator_name: profile?.display_name || 'Unknown',
          creator_username: profile?.username || 'unknown',
          creator_avatar: profile?.avatar_url || null,
          creator_bio: profile?.bio || null,
          followed_at: follow.created_at,
        };
      }) || [];

      setFollowing(formatted);
    } catch (error) {
      console.error('Error fetching following:', error);
      toast.error(isCreator ? 'Failed to load followers' : 'Failed to load following list');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (followId: string, creatorName: string) => {
    setUnfollowing(followId);
    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('id', followId);

      if (error) throw error;

      toast.success(`Unfollowed ${creatorName}`);
      fetchFollowing();
    } catch (error) {
      console.error('Error unfollowing:', error);
      toast.error('Failed to unfollow');
    } finally {
      setUnfollowing(null);
    }
  };

  const filteredFollowing = following.filter(f =>
    f.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.creator_username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/50 via-background to-rose-50/50 dark:from-pink-950/20 dark:via-background dark:to-rose-950/20 pb-20">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{isCreator ? 'Followers' : 'Following'}</h1>
          <div className="w-10" />
        </div>
      </header>
      
      <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">{isCreator ? 'Followers' : 'Following'}</h1>
        <p className="text-pink-50">
          {isCreator ? 'People who follow you' : 'Creators you\'re following'}
        </p>
      </div>

      {following.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {filteredFollowing.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={searchQuery ? "No Results" : "Not Following Anyone"}
          description={searchQuery ? "No creators match your search" : "Start following creators to see them here!"}
        />
      ) : (
        <div className="grid gap-4">
          {filteredFollowing.map((follow) => (
            <Card key={follow.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar
                      className="h-12 w-12 cursor-pointer"
                      onClick={() => navigate(`/creator/${follow.creator_username}`)}
                    >
                      <AvatarImage src={follow.creator_avatar || ''} />
                      <AvatarFallback>{follow.creator_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3
                        className="font-semibold cursor-pointer hover:underline"
                        onClick={() => navigate(`/creator/${follow.creator_username}`)}
                      >
                        {follow.creator_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">@{follow.creator_username}</p>
                      {follow.creator_bio && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {follow.creator_bio}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnfollow(follow.id, follow.creator_name)}
                    disabled={unfollowing === follow.id}
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    {unfollowing === follow.id ? 'Unfollowing...' : 'Unfollow'}
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

export default Following;
