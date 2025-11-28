import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { CreatorSearchBar } from '@/components/CreatorSearchBar';
import { Heart, MessageCircle, Lock, Home } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import CreatorDashboard from './CreatorDashboard';
import { AddFundsDialog } from '@/components/AddFundsDialog';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Creator {
  id: string;
  display_name: string;
  avatar_url: string | null;
  username: string;
}

interface FeedPost {
  id: string;
  media_type: string;
  media_url: string;
  caption: string | null;
  price: number;
  original_price?: number | null;
  discount_percentage?: number | null;
  created_at: string;
  creator: Creator;
  is_unlocked: boolean;
  is_bundle?: boolean;
  thumbnail_urls?: string[];
  content_count?: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { isCreator } = useRoleCheck();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { balance, spend } = useWallet();
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showConfirmUnlock, setShowConfirmUnlock] = useState(false);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);

  useEffect(() => {
    if (user && !isCreator) {
      fetchDashboardData();
    }
  }, [user, isCreator]);

  // If user is a creator, show creator dashboard instead
  if (isCreator) {
    return <CreatorDashboard />;
  }

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Get creators user has messaged
      const { data: conversations } = await supabase
        .from('conversations')
        .select(`
          creator_id,
          profiles:creator_id (
            id,
            display_name,
            avatar_url,
            username
          )
        `)
        .eq('customer_id', user.id);

      const uniqueCreators = conversations
        ?.map((conv: any) => conv.profiles)
        .filter((creator, index, self) => 
          creator && self.findIndex((c) => c?.id === creator.id) === index
        ) || [];

      setCreators(uniqueCreators as Creator[]);

      if (uniqueCreators.length === 0) {
        setLoading(false);
        return;
      }

      // Get feed posts from these creators
      const creatorIds = uniqueCreators.map((c: any) => c.id);
      const { data: unlockables } = await supabase
        .from('unlockables')
        .select(`
          id,
          media_type,
          media_url,
          caption,
          price,
          created_at,
          creator_id,
          unlocked_by,
          profiles:creator_id (
            id,
            display_name,
            avatar_url,
            username
          )
        `)
        .in('creator_id', creatorIds)
        .order('created_at', { ascending: false })
        .limit(50);

      const formattedPosts = unlockables?.map((post: any) => ({
        id: post.id,
        media_type: post.media_type,
        media_url: post.media_url,
        caption: post.caption || '',
        price: post.price,
        created_at: post.created_at,
        creator: post.profiles,
        is_unlocked: post.unlocked_by?.includes(user.id) || false,
        is_bundle: false,
      })) || [];

      // Get bundles from these creators
      const { data: bundles } = await supabase
        .from('content_bundles')
        .select(`
          id,
          title,
          description,
          price,
          original_price,
          discount_percentage,
          created_at,
          creator_id,
          profiles:creator_id (
            id,
            display_name,
            avatar_url,
            username
          )
        `)
        .in('creator_id', creatorIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);

      const formattedBundles = await Promise.all(
        (bundles || []).map(async (bundle: any) => {
          const { data: bundleContents } = await supabase
            .from('bundle_contents')
            .select('unlockable_id')
            .eq('bundle_id', bundle.id);

          const content_count = bundleContents?.length || 0;
          let thumbnail_urls: string[] = [];
          let is_unlocked = false;

          if (bundleContents && bundleContents.length > 0) {
            const unlockableIds = bundleContents.slice(0, 8).map((c: any) => c.unlockable_id);
            const { data: bundleUnlockables } = await supabase
              .from('unlockables')
              .select('media_url, media_type, unlocked_by')
              .in('id', unlockableIds);

            if (bundleUnlockables) {
              thumbnail_urls = bundleUnlockables
                .filter((u: any) => u.media_type === 'image' || u.media_type === 'video')
                .map((u: any) => u.media_url);

              is_unlocked = bundleUnlockables.every((u: any) => u.unlocked_by?.includes(user.id));
            }
          }

          return {
            id: bundle.id,
            media_type: 'bundle',
            media_url: '',
            caption: bundle.description || '',
            price: bundle.price,
            original_price: bundle.original_price,
            discount_percentage: bundle.discount_percentage,
            created_at: bundle.created_at,
            creator: bundle.profiles,
            is_unlocked,
            is_bundle: true,
            thumbnail_urls,
            content_count,
          };
        })
      );

      const allPosts = [...formattedPosts, ...formattedBundles].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setFeedPosts(allPosts);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = (post: FeedPost) => {
    if (balance < post.price) {
      setShowAddFunds(true);
      return;
    }
    setSelectedPost(post);
    setShowConfirmUnlock(true);
  };

  const confirmUnlock = async () => {
    if (!selectedPost || !user) return;

    try {
      // Spend from wallet
      const success = await spend(
        selectedPost.price,
        'unlockable',
        `Unlocked content from ${selectedPost.creator.display_name}`,
        selectedPost.creator.id
      );

      if (!success) {
        toast({
          title: "Error",
          description: "Failed to unlock content",
          variant: "destructive",
        });
        return;
      }

      // Update unlockable in database
      const { data: unlockable } = await supabase
        .from('unlockables')
        .select('unlocked_by')
        .eq('id', selectedPost.id)
        .single();

      const unlockedBy = unlockable?.unlocked_by || [];
      if (!unlockedBy.includes(user.id)) {
        unlockedBy.push(user.id);
      }

      await supabase
        .from('unlockables')
        .update({ unlocked_by: unlockedBy })
        .eq('id', selectedPost.id);

      // Record transaction
      await supabase.from('transactions').insert({
        customer_id: user.id,
        creator_id: selectedPost.creator.id,
        amount: selectedPost.price,
        net_amount: selectedPost.price * 0.85,
        platform_fee: selectedPost.price * 0.15,
        processor_fee: 0,
        transaction_type: 'unlockable',
        status: 'completed',
      });

      toast({
        title: "Content Unlocked!",
        description: `You can now view this content`,
      });

      // Refresh feed
      fetchDashboardData();
      setShowConfirmUnlock(false);
      setSelectedPost(null);
    } catch (error) {
      console.error('Error unlocking content:', error);
      toast({
        title: "Error",
        description: "Failed to unlock content",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <LoadingSpinner />
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <CreatorSearchBar prominent />
        </div>
        <EmptyState
          icon={Home}
          title="Welcome to your Dashboard!"
          description="You haven't connected with any creators yet. Search for a creator to get started!"
          action={{
            label: "Browse Creators",
            onClick: () => navigate('/browse')
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* Search Bar */}
      <div className="border-b border-border bg-card sticky top-0 z-10 px-4 pt-4 pb-3">
        <CreatorSearchBar />
      </div>

      {/* Feed */}
      <div className="container mx-auto max-w-2xl px-0">
        {feedPosts.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={MessageCircle}
              title="No posts yet"
              description="Your feed will appear here once creators you've messaged start posting content."
              action={{
                label: "Send a Message",
                onClick: () => navigate('/conversations')
              }}
            />
          </div>
        ) : (
          <div className="space-y-0">
            {feedPosts.map((post) => (
              <Card key={post.id} className="rounded-none border-x-0 border-t-0">
                <CardContent className="p-0">
                  {/* Post Header */}
                  <div className="flex items-center gap-3 p-4 pb-3">
                    <Avatar 
                      className="w-10 h-10 cursor-pointer"
                      onClick={() => navigate(`/creator/${post.creator.username}`)}
                    >
                      <AvatarImage src={post.creator.avatar_url || ''} alt={post.creator.display_name} />
                      <AvatarFallback>{post.creator.display_name[0]}</AvatarFallback>
                    </Avatar>
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => navigate(`/creator/${post.creator.username}`)}
                    >
                      <p className="font-semibold text-sm">{post.creator.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(post.created_at), 'h:mm a · MMM d')}
                      </p>
                    </div>
                    {!post.is_unlocked && (
                      <div className="flex items-center gap-2">
                        {post.discount_percentage && post.discount_percentage > 0 && (
                          <>
                            <span className="text-xs text-muted-foreground line-through">
                              ${((post.original_price && post.original_price > 0) ? post.original_price : (post.price / (1 - post.discount_percentage / 100))).toFixed(2)}
                            </span>
                            <Badge variant="destructive" className="text-xs">
                              {post.discount_percentage}% OFF
                            </Badge>
                          </>
                        )}
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="w-3 h-3" />
                          ${post.price.toFixed(2)}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Post Content */}
                  <div className="relative bg-muted aspect-square">
                    {post.is_bundle ? (
                      post.thumbnail_urls && post.thumbnail_urls.length > 0 ? (
                        <div className={`w-full h-full grid ${post.thumbnail_urls.length === 1 ? 'grid-cols-1' : post.thumbnail_urls.length === 2 ? 'grid-cols-2' : post.thumbnail_urls.length <= 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-3 grid-rows-3'} gap-0.5`}>
                          {post.thumbnail_urls.slice(0, 8).map((url, idx) => (
                            <div key={idx} className="relative w-full h-full overflow-hidden">
                              <img 
                                src={url} 
                                alt={`Bundle item ${idx + 1}`} 
                                className={`w-full h-full object-cover ${!post.is_unlocked ? 'blur-2xl' : ''}`} 
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Lock className="w-16 h-16 text-muted-foreground" />
                        </div>
                      )
                    ) : post.media_type === 'image' ? (
                      <img
                        src={post.media_url}
                        alt={post.caption || 'Content'}
                        className={`w-full h-full object-cover ${!post.is_unlocked ? 'blur-2xl' : ''}`}
                      />
                    ) : post.media_type === 'video' ? (
                      <video
                        src={post.media_url}
                        className={`w-full h-full object-cover ${!post.is_unlocked ? 'blur-2xl' : ''}`}
                        controls={post.is_unlocked}
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${!post.is_unlocked ? 'blur-2xl' : ''}`}>
                        <MessageCircle className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                    
                    {!post.is_unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Button
                          size="lg"
                          onClick={() => handleUnlock(post)}
                          className="gap-2 shadow-lg"
                        >
                          <Lock className="w-4 h-4" />
                          Unlock for ${post.price}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Post Actions */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-4">
                      <button className="hover:opacity-75 transition-opacity">
                        <Heart className="w-6 h-6" />
                      </button>
                      <button 
                        className="hover:opacity-75 transition-opacity"
                        onClick={() => navigate('/conversations')}
                      >
                        <MessageCircle className="w-6 h-6" />
                      </button>
                    </div>
                    
                    {post.caption && (
                      <p className="text-sm">
                        <span className="font-semibold mr-2">{post.creator.display_name}</span>
                        {post.caption}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <AddFundsDialog
        open={showAddFunds}
        onOpenChange={setShowAddFunds}
        requiredAmount={selectedPost?.price}
        currentBalance={balance}
        onSuccess={() => {
          setShowAddFunds(false);
          if (selectedPost) {
            handleUnlock(selectedPost);
          }
        }}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmUnlock} onOpenChange={setShowConfirmUnlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlock this content for ${selectedPost?.price.toFixed(2)}?
              <br />
              Your current balance: ${balance.toFixed(2)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedPost(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnlock}>Unlock Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
