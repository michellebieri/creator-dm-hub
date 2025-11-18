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
  created_at: string;
  creator: Creator;
  is_unlocked: boolean;
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
      })) || [];

      setFeedPosts(formattedPosts);
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
        <EmptyState
          icon={Home}
          title="Welcome to your Dashboard!"
          description="Start browsing creators and send a message to see their content in your feed."
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
      {/* Stories/Quick Access */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <ScrollArea className="w-full">
          <div className="flex gap-4 p-4 pb-3">
            {creators.map((creator) => (
              <button
                key={creator.id}
                onClick={() => navigate(`/creator/${creator.username}`)}
                className="flex flex-col items-center gap-2 min-w-[80px] hover:opacity-75 transition-opacity"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-accent p-0.5">
                    <Avatar className="w-full h-full border-2 border-background">
                      <AvatarImage src={creator.avatar_url || ''} alt={creator.display_name} />
                      <AvatarFallback>{creator.display_name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground line-clamp-1 max-w-[80px]">
                  {creator.display_name}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
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
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="w-3 h-3" />
                        ${post.price}
                      </Badge>
                    )}
                  </div>

                  {/* Post Content */}
                  <div className="relative bg-muted aspect-square">
                    {post.media_type === 'image' ? (
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
