import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Upload, Plus, Search, SortAsc, Image, Video, FolderOpen, Package, Lock, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [isBundleEditOpen, setIsBundleEditOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [bundleContents, setBundleContents] = useState<Unlockable[]>([]);
  const [bundleSelectedContent, setBundleSelectedContent] = useState<Set<string>>(new Set());
  const [showContentSelector, setShowContentSelector] = useState(false);
  const [savingBundle, setSavingBundle] = useState(false);

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

  const handleBundleClick = async (bundle: Bundle) => {
    setEditingBundle(bundle);
    
    // Fetch bundle contents
    const { data: contents } = await supabase
      .from('bundle_contents')
      .select('unlockable_id')
      .eq('bundle_id', bundle.id);
    
    if (contents) {
      setBundleSelectedContent(new Set(contents.map(item => item.unlockable_id)));
      
      // Fetch full unlockable details
      const { data: unlockablesData } = await supabase
        .from('unlockables')
        .select('*')
        .in('id', contents.map(c => c.unlockable_id));
      
      setBundleContents(unlockablesData || []);
    }
    
    setIsBundleEditOpen(true);
  };

  const handleSaveBundle = async () => {
    if (!editingBundle) return;
    
    if (!editingBundle.title || editingBundle.price <= 0 || bundleSelectedContent.size === 0) {
      toast.error('Title, price, and at least one content item are required');
      return;
    }
    
    if (bundleSelectedContent.size < 3) {
      toast.error('A bundle must contain at least 3 items. Please select more content.');
      return;
    }
    
    const discountValue = editingBundle.discount_percentage || 0;
    if (discountValue < 0 || discountValue > 100) {
      toast.error('Discount percentage must be between 0 and 100');
      return;
    }
    
    setSavingBundle(true);
    
    try {
      // Update bundle
      const { error: updateError } = await supabase
        .from('content_bundles')
        .update({
          title: editingBundle.title,
          description: editingBundle.description,
          price: editingBundle.price,
          discount_percentage: editingBundle.discount_percentage,
        })
        .eq('id', editingBundle.id);
      
      if (updateError) throw updateError;
      
      // Update bundle contents
      await supabase
        .from('bundle_contents')
        .delete()
        .eq('bundle_id', editingBundle.id);
      
      const contents = Array.from(bundleSelectedContent).map((unlockableId, index) => ({
        bundle_id: editingBundle.id,
        unlockable_id: unlockableId,
        sort_order: index,
      }));
      
      const { error: contentsError } = await supabase
        .from('bundle_contents')
        .insert(contents);
      
      if (contentsError) throw contentsError;
      
      toast.success('Bundle updated successfully');
      setIsBundleEditOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update bundle');
    } finally {
      setSavingBundle(false);
    }
  };

  const handleDeleteBundle = async () => {
    if (!editingBundle) return;
    
    if (!confirm('Mark this bundle as inactive? Users who already purchased it will still have access, but it will no longer be available for new purchases.')) return;
    
    try {
      // Soft delete - mark as inactive
      const { error } = await supabase
        .from('content_bundles')
        .update({ is_active: false })
        .eq('id', editingBundle.id);
      
      if (error) throw error;
      
      toast.success('Bundle marked as inactive');
      setIsBundleEditOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete bundle');
    }
  };

  const toggleContentSelection = (id: string) => {
    setBundleSelectedContent(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const calculateOriginalPrice = () => {
    if (!editingBundle) return 0;
    return Array.from(bundleSelectedContent).reduce((total, id) => {
      const item = unlockables.find(u => u.id === id);
      return total + (item?.price || 0);
    }, 0);
  };

  const calculateSavings = () => {
    const original = calculateOriginalPrice();
    return original - (editingBundle?.price || 0);
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

      {/* Bundle Edit Dialog */}
      <Dialog open={isBundleEditOpen} onOpenChange={setIsBundleEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bundle</DialogTitle>
          </DialogHeader>
          {editingBundle && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bundle-title">Bundle Title</Label>
                  <Input
                    id="bundle-title"
                    value={editingBundle.title}
                    onChange={(e) => setEditingBundle({ ...editingBundle, title: e.target.value })}
                    placeholder="My Content Bundle"
                  />
                </div>
                
                <div>
                  <Label htmlFor="bundle-description">Description</Label>
                  <Input
                    id="bundle-description"
                    value={editingBundle.description || ''}
                    onChange={(e) => setEditingBundle({ ...editingBundle, description: e.target.value })}
                    placeholder="Bundle description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bundle-price">Bundle Price ($)</Label>
                    <Input
                      id="bundle-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingBundle.price}
                      onChange={(e) => setEditingBundle({ ...editingBundle, price: parseFloat(e.target.value) || 0 })}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bundle-discount">Discount Badge (%)</Label>
                    <Input
                      id="bundle-discount"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={editingBundle.discount_percentage || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setEditingBundle({ ...editingBundle, discount_percentage: Math.min(100, Math.max(0, val)) });
                      }}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Original Price (sum of items):</span>
                    <span className="font-medium">${calculateOriginalPrice().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bundle Price:</span>
                    <span className="font-medium">${editingBundle.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-green-600">
                    <span>Customer Saves:</span>
                    <span>${calculateSavings().toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Bundle Content ({bundleSelectedContent.size} items)
                    {bundleSelectedContent.size < 3 && (
                      <span className="text-destructive ml-2">• Minimum 3 items required</span>
                    )}
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowContentSelector(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Edit Content
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {bundleContents.map((content) => (
                    <div key={content.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={content.media_url}
                        alt="Bundle content"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-xs text-white">${content.price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveBundle}
                  disabled={savingBundle || bundleSelectedContent.size < 3 || !editingBundle.title || editingBundle.price <= 0}
                  className="flex-1"
                >
                  {savingBundle ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteBundle}
                >
                  Delete Bundle
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Content Selector Dialog */}
      <Dialog open={showContentSelector} onOpenChange={setShowContentSelector}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Select Bundle Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-[60vh]">
            <p className="text-sm text-muted-foreground">
              Selected: {bundleSelectedContent.size} items
            </p>
            <div className="grid grid-cols-3 gap-3">
              {unlockables.map((content) => (
                <div
                  key={content.id}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    bundleSelectedContent.has(content.id)
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-transparent hover:border-muted-foreground/20'
                  }`}
                  onClick={() => toggleContentSelection(content.id)}
                >
                  <img
                    src={content.media_url}
                    alt={content.title || 'Content'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Checkbox checked={bundleSelectedContent.has(content.id)} />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-xs text-white">${content.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowContentSelector(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                // Update bundle contents display
                const { data: unlockablesData } = await supabase
                  .from('unlockables')
                  .select('*')
                  .in('id', Array.from(bundleSelectedContent));
                
                setBundleContents(unlockablesData || []);
                setShowContentSelector(false);
                toast.success('Content selection updated');
              }}
              className="flex-1"
            >
              Apply Selection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
