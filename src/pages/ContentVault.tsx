import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Upload, Plus, Search, SortAsc, Image, Video, FolderOpen, Package, Lock, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { ContentEditModal } from '@/components/ContentEditModal';
import { FolderNavigation } from '@/components/FolderNavigation';
import { ContentGridItem } from '@/components/ContentGridItem';
import { ContentBundleManager } from '@/components/ContentBundleManager';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BundlePurchase } from '@/components/BundlePurchase';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Unlockable {
  id: string;
  media_url: string;
  media_type: string;
  price: number;
  caption?: string;
  title?: string;
  created_at: string;
  unlocked_by: string[] | null;
}

interface Bundle {
  id: string;
  title: string;
  price: number;
  thumbnail_url: string | null;
  content_count: number;
  description: string | null;
  discount_percentage: number | null;
}

export default function ContentVault() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [unlockables, setUnlockables] = useState<Unlockable[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [activeFolder, setActiveFolder] = useState<'all' | 'photos' | 'videos' | 'bundles'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedContent, setSelectedContent] = useState<Unlockable | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBundleDialogOpen, setIsBundleDialogOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [isBundleViewOpen, setIsBundleViewOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setDataLoading(true);

    // Fetch unlockables
    const { data: unlockablesData, error: unlockError } = await supabase
      .from('unlockables')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (unlockError) {
      console.error('Error fetching unlockables:', unlockError);
    } else {
      setUnlockables(unlockablesData || []);
    }

    // Fetch bundles
    const { data: bundlesData, error: bundleError } = await supabase
      .from('content_bundles')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (bundleError) {
      console.error('Error fetching bundles:', bundleError);
    } else {
      // Get content counts for each bundle
      const bundlesWithCounts = await Promise.all(
        (bundlesData || []).map(async (bundle) => {
          const { count } = await supabase
            .from('bundle_contents')
            .select('*', { count: 'exact', head: true })
            .eq('bundle_id', bundle.id);

          return { 
            ...bundle, 
            content_count: count || 0,
            description: bundle.description,
            discount_percentage: bundle.discount_percentage
          };
        })
      );
      setBundles(bundlesWithCounts);
    }

    setDataLoading(false);
  };

  const handleContentClick = (content: Unlockable) => {
    setSelectedContent(content);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
    setSelectedContent(null);
    fetchData(); // Refresh data after edit
  };

  const handleBundleClick = (bundle: Bundle) => {
    setSelectedBundle(bundle);
    setIsBundleViewOpen(true);
  };

  // Calculate folder counts
  const folderCounts = {
    photos: unlockables.filter(u => u.media_type === 'image').length,
    videos: unlockables.filter(u => u.media_type === 'video').length,
    bundles: bundles.length,
    total: unlockables.length // All content = all unlockables, NOT bundles
  };

  // Filter content based on active folder and search
  const getFilteredContent = () => {
    let filtered = [...unlockables];
    
    // Apply folder filter
    if (activeFolder === 'photos') {
      filtered = filtered.filter(u => u.media_type === 'image');
    } else if (activeFolder === 'videos') {
      filtered = filtered.filter(u => u.media_type === 'video');
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(u => 
        u.media_url.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    }

    return filtered;
  };

  const filteredContent = getFilteredContent();
  const displayBundles = activeFolder === 'bundles'; // Only show bundles in bundles tab

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-14 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-7xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Content Vault</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => navigate('/content-upload')}
            className="flex-1 sm:flex-none"
            size="lg"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload Content
          </Button>
          
          <Dialog open={isBundleDialogOpen} onOpenChange={setIsBundleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none" size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Bundle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Content Bundle</DialogTitle>
              </DialogHeader>
              <ContentBundleManager 
                creatorId={user?.id || ''} 
                unlockables={unlockables}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Folder Navigation */}
        <FolderNavigation
          activeFolder={activeFolder}
          onFolderChange={setActiveFolder}
          counts={folderCounts}
        />

        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Grid */}
        {dataLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* Display Bundles if in bundles view */}
            {displayBundles && bundles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    Bundle{bundles.length !== 1 ? 's' : ''} ({bundles.length})
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {bundles.map((bundle) => (
                    <ContentGridItem
                      key={bundle.id}
                      id={bundle.id}
                      thumbnailUrl={bundle.thumbnail_url || '/placeholder.svg'}
                      title={bundle.title}
                      price={bundle.price}
                      type="bundle"
                      itemCount={bundle.content_count}
                      onClick={() => handleBundleClick(bundle)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Show empty state if in bundles view and no bundles */}
            {displayBundles && bundles.length === 0 && (
              <EmptyState
                icon={Package}
                title="No bundles yet"
                description="Create your first bundle to get started"
                action={{
                  label: 'Create Bundle',
                  onClick: () => setIsBundleDialogOpen(true)
                }}
              />
            )}

            {/* Display Content Items */}
            {(activeFolder !== 'bundles') && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredContent.length > 0 ? (
                  filteredContent.map((content) => (
                    <ContentGridItem
                      key={content.id}
                      id={content.id}
                      thumbnailUrl={content.media_url}
                      title={content.title}
                      caption={content.caption}
                      price={content.price}
                      type={content.media_type === 'image' ? 'image' : 'video'}
                      onClick={() => handleContentClick(content)}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon={activeFolder === 'photos' ? Image : activeFolder === 'videos' ? Video : FolderOpen}
                    title={`No ${activeFolder === 'all' ? 'content' : activeFolder} yet`}
                    description="Upload your first content to get started"
                    action={{
                      label: 'Upload Content',
                      onClick: () => navigate('/content-upload')
                    }}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {selectedContent && (
        <ContentEditModal
          isOpen={isEditModalOpen}
          onClose={handleModalClose}
          content={selectedContent}
          onUpdate={fetchData}
        />
      )}

      {/* Bundle Edit/View Dialog */}
      <Dialog open={isBundleViewOpen} onOpenChange={setIsBundleViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bundle Details - {selectedBundle?.title}</DialogTitle>
          </DialogHeader>
          {selectedBundle && (
            <div className="space-y-6">
              {selectedBundle.thumbnail_url && (
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={selectedBundle.thumbnail_url}
                    alt={selectedBundle.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold">${selectedBundle.price.toFixed(2)}</h3>
                      {selectedBundle.discount_percentage && selectedBundle.discount_percentage > 0 && (
                        <Badge variant="secondary">
                          {selectedBundle.discount_percentage}% OFF
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedBundle.content_count} items included
                    </p>
                  </div>
                </div>
                {selectedBundle.description && (
                  <p className="text-muted-foreground">{selectedBundle.description}</p>
                )}
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <p className="text-sm font-medium">Creator View</p>
                  <p className="text-sm text-muted-foreground">
                    To edit this bundle's title, description, price, discount, or included content, use the Bundle Manager section above.
                  </p>
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => setIsBundleViewOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
