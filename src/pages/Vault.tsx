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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Video, Music, Package, Vault as VaultIcon, Download, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import ContentVault from './ContentVault';

interface Creator {
  id: string;
  display_name: string;
  avatar_url: string | null;
  username: string;
}

interface PurchasedContent {
  id: string;
  media_type: string;
  media_url: string;
  caption: string | null;
  price: number;
  created_at: string;
  unlocked_at: string;
  creator: Creator;
}

interface PurchasedBundle {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  purchased_at: string;
  creator: Creator;
  content_count: number;
}

const Vault = () => {
  const { user } = useAuth();
  const { isCreator } = useRoleCheck();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [purchasedContent, setPurchasedContent] = useState<PurchasedContent[]>([]);
  const [purchasedBundles, setPurchasedBundles] = useState<PurchasedBundle[]>([]);

  useEffect(() => {
    if (user && !isCreator) {
      fetchVaultData();
    }
  }, [user, isCreator]);

  // Disable right-click and screenshots
  useEffect(() => {
    const disableContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
        e.preventDefault();
        toast.error('Content downloads are disabled for protection');
      }
    };

    const disableScreenshot = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
        toast.error('Screenshots are disabled for content protection');
      }
      if (e.key === 'PrintScreen') {
        toast.error('Screenshots are disabled for content protection');
      }
    };

    document.addEventListener('contextmenu', disableContextMenu);
    document.addEventListener('keydown', disableScreenshot);

    return () => {
      document.removeEventListener('contextmenu', disableContextMenu);
      document.removeEventListener('keydown', disableScreenshot);
    };
  }, []);

  // If user is a creator, show content vault instead
  if (isCreator) {
    return <ContentVault />;
  }

  const fetchVaultData = async () => {
    if (!user) return;

    try {
      // Fetch unlocked content
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
        .contains('unlocked_by', [user.id])
        .order('created_at', { ascending: false });

      const formattedContent = unlockables?.map((item: any) => ({
        id: item.id,
        media_type: item.media_type,
        media_url: item.media_url,
        caption: item.caption || '',
        price: item.price,
        created_at: item.created_at,
        unlocked_at: item.created_at, // Use created_at as proxy for unlock time
        creator: item.profiles,
      })) || [];

      setPurchasedContent(formattedContent);

      // Get unique creators
      const uniqueCreators = formattedContent
        .map(c => c.creator)
        .filter((creator, index, self) => 
          self.findIndex(c => c.id === creator.id) === index
        );

      setCreators(uniqueCreators);

      // Fetch purchased bundles (transactions with pack_id)
      const { data: bundleTransactions } = await supabase
        .from('transactions')
        .select(`
          id,
          created_at,
          amount,
          content_bundles:pack_id (
            id,
            title,
            description,
            thumbnail_url,
            price,
            creator_id,
            profiles:creator_id (
              id,
              display_name,
              avatar_url,
              username
            )
          )
        `)
        .eq('customer_id', user.id)
        .eq('transaction_type', 'pack')
        .not('pack_id', 'is', null);

      const formattedBundles = bundleTransactions
        ?.filter((t: any) => t.content_bundles)
        .map((t: any) => ({
          id: t.content_bundles.id,
          title: t.content_bundles.title,
          description: t.content_bundles.description,
          thumbnail_url: t.content_bundles.thumbnail_url,
          price: t.content_bundles.price,
          purchased_at: t.created_at,
          creator: t.content_bundles.profiles,
          content_count: 0, // Would need to count bundle_contents
        })) || [];

      setPurchasedBundles(formattedBundles);
    } catch (error) {
      console.error('Error fetching vault data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterContent = (type: string) => {
    let filtered = selectedCreator 
      ? purchasedContent.filter(c => c.creator.id === selectedCreator)
      : purchasedContent;

    if (type !== 'all') {
      filtered = filtered.filter(c => c.media_type === type);
    }

    return filtered;
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      default: return <Image className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <LoadingSpinner />
      </div>
    );
  }

  if (purchasedContent.length === 0 && purchasedBundles.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-4">
        <header className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">My Vault</h1>
            <div className="w-10" />
          </div>
        </header>
        
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <EmptyState
            icon={VaultIcon}
            title="No purchased content yet"
            description="Browse creators and unlock exclusive content to see it here."
            action={{
              label: "Browse Creators",
              onClick: () => navigate('/browse')
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-4">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">My Vault</h1>
          <div className="w-10" />
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <Badge variant="secondary">
            {purchasedContent.length} items
          </Badge>
        </div>

        {/* Filter by Creator */}
        {creators.length > 1 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium mb-3 text-muted-foreground">Filter by Creator</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              <Button
                variant={selectedCreator === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCreator(null)}
              >
                All Creators
              </Button>
              {creators.map((creator) => (
                <Button
                  key={creator.id}
                  variant={selectedCreator === creator.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCreator(creator.id)}
                  className="gap-2 whitespace-nowrap"
                >
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={creator.avatar_url || ''} />
                    <AvatarFallback className="text-xs">{creator.display_name[0]}</AvatarFallback>
                  </Avatar>
                  {creator.display_name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Content Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">
              All Content ({filterContent('all').length})
            </TabsTrigger>
            <TabsTrigger value="image">
              Photos ({filterContent('image').length})
            </TabsTrigger>
            <TabsTrigger value="video">
              Videos ({filterContent('video').length})
            </TabsTrigger>
            <TabsTrigger value="bundles">
              Bundles ({purchasedBundles.length})
            </TabsTrigger>
          </TabsList>

          {['all', 'image', 'video'].map((type) => (
            <TabsContent key={type} value={type}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filterContent(type).map((item) => (
                  <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <div className="relative aspect-square bg-muted">
                        {item.media_type === 'image' ? (
                          <img
                            src={item.media_url}
                            alt={item.caption || 'Content'}
                            className="w-full h-full object-cover"
                          />
                        ) : item.media_type === 'video' ? (
                          <video
                            src={item.media_url}
                            className="w-full h-full object-cover"
                            controls
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="gap-1 text-xs">
                            {getMediaIcon(item.media_type)}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={item.creator.avatar_url || ''} />
                            <AvatarFallback className="text-xs">{item.creator.display_name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium truncate">{item.creator.display_name}</span>
                        </div>
                        {item.caption && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.caption}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.unlocked_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}

          <TabsContent value="bundles">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {purchasedBundles.map((bundle) => (
                <Card key={bundle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="relative aspect-video bg-muted">
                      {bundle.thumbnail_url ? (
                        <img
                          src={bundle.thumbnail_url}
                          alt={bundle.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="gap-1">
                          <Package className="w-3 h-3" />
                          Bundle
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold line-clamp-1">{bundle.title}</h3>
                      {bundle.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{bundle.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{format(new Date(bundle.purchased_at), 'MMM d, yyyy')}</span>
                        <span>${bundle.price}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Vault;
