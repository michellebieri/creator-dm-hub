import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Heart, Search, UserMinus } from 'lucide-react';
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
      const { data, error } = await supabase
        .from('user_follows')
        .select(`
          id,
          following_id,
          created_at
        `)
        .eq('follower_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get creator profiles
      const creatorIds = data?.map(f => f.following_id) || [];
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, bio')
        .in('id', creatorIds);

      const creatorMap = new Map(creators?.map(c => [c.id, c]) || []);

      const formatted = data?.map(follow => {
        const creator = creatorMap.get(follow.following_id);
        return {
          id: follow.id,
          following_id: follow.following_id,
          creator_name: creator?.display_name || 'Unknown',
          creator_username: creator?.username || 'unknown',
          creator_avatar: creator?.avatar_url || null,
          creator_bio: creator?.bio || null,
          followed_at: follow.created_at,
        };
      }) || [];

      setFollowing(formatted);
    } catch (error) {
      console.error('Error fetching following:', error);
      toast.error('Failed to load following list');
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
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Following</h1>
        <p className="text-muted-foreground">Creators you're following</p>
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
  );
};

export default Following;
