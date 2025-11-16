import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Upload, Plus, Search, SortAsc } from 'lucide-react';
import { ContentEditModal } from '@/components/ContentEditModal';
import { FolderNavigation } from '@/components/FolderNavigation';
import { ContentGridItem } from '@/components/ContentGridItem';
import { ContentBundleManager } from '@/components/ContentBundleManager';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Unlockable {
  id: string;
  media_url: string;
  media_type: string;
  price: number;
  created_at: string;
  unlocked_by: string[] | null;
}

interface Bundle {
  id: string;
  title: string;
  price: number;
  thumbnail_url: string | null;
  content_count: number;
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

          return { ...bundle, content_count: count || 0 };
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

  // Calculate folder counts
  const folderCounts = {
    photos: unlockables.filter(u => u.media_type === 'image').length,
    videos: unlockables.filter(u => u.media_type === 'video').length,
    bundles: bundles.length,
    total: unlockables.length + bundles.length
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
  const displayBundles = activeFolder === 'bundles' || activeFolder === 'all';

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
    </div>
  );
}
