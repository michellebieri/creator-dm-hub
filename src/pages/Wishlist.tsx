import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Heart, Trash2, ShoppingCart, Image, Video, Music, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface WishlistItem {
  id: string;
  unlockable_id: string;
  media_type: string;
  media_url: string;
  price: number;
  creator_id: string;
  creator_name: string;
  creator_username: string;
  added_at: string;
}

const Wishlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    }
  }, [user]);

  const fetchWishlist = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          id,
          unlockable_id,
          created_at,
          unlockables (
            media_type,
            media_url,
            price,
            creator_id
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get creator details
      const creatorIds = data?.map(w => w.unlockables?.creator_id).filter(Boolean) || [];
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .in('id', creatorIds);

      const creatorMap = new Map(creators?.map(c => [c.id, c]) || []);

      const formatted = data?.map(item => {
        const unlockable = item.unlockables;
        const creator = creatorMap.get(unlockable?.creator_id);
        return {
          id: item.id,
          unlockable_id: item.unlockable_id,
          media_type: unlockable?.media_type || 'image',
          media_url: unlockable?.media_url || '',
          price: unlockable?.price || 0,
          creator_id: unlockable?.creator_id || '',
          creator_name: creator?.display_name || 'Unknown',
          creator_username: creator?.username || 'unknown',
          added_at: item.created_at,
        };
      }) || [];

      setWishlist(formatted);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (wishlistId: string) => {
    setRemoving(wishlistId);
    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('id', wishlistId);

      if (error) throw error;

      toast.success('Removed from wishlist');
      fetchWishlist();
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('Failed to remove item');
    } finally {
      setRemoving(null);
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'audio':
        return <Music className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
      default:
        return <Image className="h-5 w-5" />;
    }
  };

  const totalValue = wishlist.reduce((sum, item) => sum + item.price, 0);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Wishlist</h1>
        <p className="text-muted-foreground">Content you want to unlock</p>
      </div>

      {wishlist.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Wishlist Summary</CardTitle>
            <CardDescription>
              {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} • Total value: ${totalValue.toFixed(2)}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {wishlist.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your Wishlist is Empty"
          description="Add content to your wishlist to keep track of what you want to unlock!"
        />
      ) : (
        <div className="grid gap-4">
          {wishlist.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="bg-muted rounded-lg p-4 flex items-center justify-center">
                      {getMediaIcon(item.media_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{item.media_type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          by{' '}
                          <span
                            className="font-medium hover:underline cursor-pointer"
                            onClick={() => navigate(`/creator/${item.creator_username}`)}
                          >
                            {item.creator_name}
                          </span>
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Unlock
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemove(item.id)}
                      disabled={removing === item.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
