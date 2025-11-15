import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Image, Video, Music, FileText, Search, Package, Unlock, Eye } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface UnlockedContent {
  id: string;
  media_type: string;
  media_url: string;
  price: number;
  created_at: string;
  creator_id: string;
  creator_name: string;
  unlocked_at: string;
}

interface PurchasedBundle {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  creator_id: string;
  creator_name: string;
  purchased_at: string;
  content_count: number;
}

const MyLibrary = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [unlockedContent, setUnlockedContent] = useState<UnlockedContent[]>([]);
  const [purchasedBundles, setPurchasedBundles] = useState<PurchasedBundle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    if (user) {
      fetchLibraryData();
    }
  }, [user]);

  // Disable right-click context menu and screenshot attempts
  useEffect(() => {
    const disableContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
        e.preventDefault();
        toast.error('Content downloads are disabled for protection');
      }
    };

    const disableScreenshot = (e: KeyboardEvent) => {
      // Detect common screenshot shortcuts
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

  const fetchLibraryData = async () => {
    if (!user) return;

    try {
      // Fetch unlocked content
      const { data: unlockables, error: unlockError } = await supabase
        .from('unlockables')
        .select(`
          id,
          media_type,
          media_url,
          price,
          created_at,
          creator_id,
          unlocked_by
        `)
        .contains('unlocked_by', [user.id]);

      if (unlockError) throw unlockError;

      // Get creator names for unlocked content
      const creatorIds = [...new Set(unlockables?.map(u => u.creator_id) || [])];
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', creatorIds);

      const creatorMap = new Map(creators?.map(c => [c.id, c.display_name]) || []);

      const formattedUnlocked = unlockables?.map(item => ({
        ...item,
        creator_name: creatorMap.get(item.creator_id) || 'Unknown',
        unlocked_at: item.created_at,
      })) || [];

      setUnlockedContent(formattedUnlocked);

      // Fetch purchased bundles from transactions
      const { data: bundleTransactions, error: bundleError } = await supabase
        .from('transactions')
        .select(`
          created_at,
          creator_id
        `)
        .eq('customer_id', user.id)
        .eq('transaction_type', 'unlockable')
        .eq('status', 'completed');

      if (bundleError) throw bundleError;

      // Get unique bundle purchases (simplified - in production you'd track bundle_id in transactions)
      const bundleCreators = [...new Set(bundleTransactions?.map(t => t.creator_id) || [])];
      
      // For now, show bundles from creators user has purchased from
      const { data: bundles } = await supabase
        .from('content_bundles')
        .select(`
          id,
          title,
          description,
          thumbnail_url,
          price,
          creator_id
        `)
        .in('creator_id', bundleCreators)
        .eq('is_active', true);

      const formattedBundles = await Promise.all(
        (bundles || []).map(async (bundle) => {
          const { count } = await supabase
            .from('bundle_contents')
            .select('id', { count: 'exact', head: true })
            .eq('bundle_id', bundle.id);

          return {
            ...bundle,
            creator_name: creatorMap.get(bundle.creator_id) || 'Unknown',
            purchased_at: bundleTransactions?.find(t => t.creator_id === bundle.creator_id)?.created_at || '',
            content_count: count || 0,
          };
        })
      );

      setPurchasedBundles(formattedBundles);
    } catch (error) {
      console.error('Error fetching library:', error);
      toast.error('Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-5 w-5" />;
      case 'video': return <Video className="h-5 w-5" />;
      case 'audio': return <Music className="h-5 w-5" />;
      case 'document': return <FileText className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download');
    }
  };

  const filterContent = (content: UnlockedContent[]) => {
    let filtered = content;

    // Filter by media type
    if (mediaFilter !== 'all') {
      filtered = filtered.filter(item => item.media_type === mediaFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.creator_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.unlocked_at).getTime() - new Date(b.unlocked_at).getTime());
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
    }

    return filtered;
  };

  const filteredContent = filterContent(unlockedContent);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Library</h1>
        <p className="text-muted-foreground">Access all your purchased content and bundles</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <Unlock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unlockedContent.length}</div>
            <p className="text-xs text-muted-foreground">Unlocked items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bundles</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchasedBundles.length}</div>
            <p className="text-xs text-muted-foreground">Purchased bundles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <Badge variant="secondary">$</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${unlockedContent.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">On content</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Unlocked Content</TabsTrigger>
          <TabsTrigger value="bundles">Bundles</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={mediaFilter} onValueChange={setMediaFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="price-high">Highest Price</SelectItem>
                <SelectItem value="price-low">Lowest Price</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Grid */}
          {filteredContent.length === 0 ? (
            <EmptyState
              icon={Unlock}
              title="No content yet"
              description="Start unlocking content from your favorite creators"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContent.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    {item.media_type === 'image' ? (
                      <img src={item.media_url} alt="Content" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        {getMediaIcon(item.media_type)}
                        <span className="text-sm capitalize">{item.media_type}</span>
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-base">{item.creator_name}</CardTitle>
                        <CardDescription>
                          Unlocked {format(new Date(item.unlocked_at), 'MMM d, yyyy')}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">${item.price}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(item.media_url, '_blank')}
                    >
                      {getMediaIcon(item.media_type)}
                      <span className="ml-2">View Full Size</span>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bundles" className="space-y-4">
          {purchasedBundles.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No bundles yet"
              description="Purchase content bundles to get exclusive collections"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchasedBundles.map((bundle) => (
                <Card key={bundle.id}>
                  {bundle.thumbnail_url && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={bundle.thumbnail_url}
                        alt={bundle.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{bundle.title}</CardTitle>
                    {bundle.description && (
                      <CardDescription className="line-clamp-2">{bundle.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">By {bundle.creator_name}</span>
                      <Badge variant="secondary">${bundle.price}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{bundle.content_count} items</span>
                      <span className="text-muted-foreground">
                        {format(new Date(bundle.purchased_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyLibrary;
