import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, Loader2, ArrowLeft, Lock, Image as ImageIcon, Video as VideoIcon, Package, UserPlus, Check, ExternalLink, Crown } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';
import { AddFundsDialog } from '@/components/AddFundsDialog';
import { ContentGridSkeleton } from '@/components/ui/skeleton';
import { useFollowing } from '@/hooks/useFollowing';
import { ContentViewer } from '@/components/ContentViewer';
import { SubscriptionTiersDisplay } from '@/components/SubscriptionTiersDisplay';
import { useSubscription } from '@/hooks/useSubscription';
import { BottomNavigation } from '@/components/BottomNavigation';

interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
}

interface ContentItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video' | 'audio' | 'document';
  price: number;
  title?: string;
  caption?: string;
  created_at: string;
  unlocked_by: string[] | null;
  free_for_subscribers?: boolean;
}

interface Bundle {
  id: string;
  title: string;
  price: number;
  thumbnail_url?: string;
  thumbnail_urls?: string[];
  created_at: string;
  content_count: number;
  discount_percentage?: number;
  original_price?: number;
  description?: string;
  purchased?: boolean;
}

type FolderType = 'all' | 'photos' | 'videos' | 'bundles';

// Helper function to calculate original price from discounted price
const calculateOriginalPrice = (finalPrice: number, discountPercentage: number): number => {
  if (!discountPercentage || discountPercentage <= 0) return finalPrice;
  return Math.round(finalPrice / (1 - discountPercentage / 100));
};

const CreatorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { balance, spend } = useWallet();
  const [creatorUserId, setCreatorUserId] = useState<string | null>(null);
  const { isFollowing, followersCount, loading: followLoading, toggleFollow } = useFollowing(user?.id, creatorUserId);
  const { isSubscribed } = useSubscription(user?.id, creatorUserId);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<FolderType>('all');
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [bundlePurchaseDialogOpen, setBundlePurchaseDialogOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [purchasingBundle, setPurchasingBundle] = useState(false);
  const [pricePerMessage, setPricePerMessage] = useState<number>(5);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [itemsToShow, setItemsToShow] = useState(20);
  const [contentViewerOpen, setContentViewerOpen] = useState(false);
  const [viewerContent, setViewerContent] = useState<ContentItem[]>([]);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCreatorData();
  }, [id, user?.id]);

  const fetchCreatorData = async () => {
    if (!id) return;
    
    // Clean the identifier (remove @ if present at start)
    const cleanId = id.startsWith('@') ? id.substring(1) : id;
    
    try {
      // Try multiple lookup methods for flexibility
      let profileData: any = null;
      
      // Method 1: Try exact username match (case-insensitive) — role checked via user_roles
      const { data: exactMatch } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .ilike('username', cleanId)
        .limit(1)
        .maybeSingle();

      if (exactMatch) {
        profileData = exactMatch;
      }

      // Method 2: If not found and looks like UUID, try direct ID lookup
      if (!profileData && cleanId.length === 36) {
        const { data: idMatch } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio')
          .eq('id', cleanId)
          .maybeSingle();
        if (idMatch) {
          profileData = idMatch;
        }
      }

      // Method 3: Try partial username or display_name search
      if (!profileData) {
        const { data: partialMatch } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio')
          .or(`username.ilike.%${cleanId}%,display_name.ilike.%${cleanId}%`)
          .limit(1)
          .maybeSingle();
        if (partialMatch) {
          profileData = partialMatch;
        }
      }
      
      if (!profileData) {
        toast({
          title: 'Creator not found',
          description: `Could not find a creator matching "${cleanId}"`,
          variant: 'destructive',
        });
        navigate('/');
        return;
      }
      
      setProfile(profileData);
      setCreatorUserId(profileData.id);

      // Use secure RPC function for creator pricing (excludes sensitive data like stripe_account_id)
      const { data: pricingData } = await supabase
        .rpc('get_creator_pricing', { creator_id: profileData.id });
      
      if (pricingData && pricingData[0]) {
        setPricePerMessage(pricingData[0].price_per_message);
      }
      
      // Note: Social links are intentionally NOT fetched here for public viewing
      // They can only be accessed by the creator themselves in their settings
      setSocialLinks({});

      const { data: contentData } = await supabase
        .from('unlockables')
        .select('id, media_url, media_type, price, title, caption, created_at, unlocked_by, creator_id, free_for_subscribers')
        .eq('creator_id', profileData.id)
        .order('created_at', { ascending: false })
        .limit(itemsToShow);
      setContent(contentData || []);

      const { data: bundlesData } = await supabase
        .from('content_bundles')
        .select('*')
        .eq('creator_id', profileData.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const bundlesWithCounts = await Promise.all(
        (bundlesData || []).map(async (bundle) => {
          const { data: bundleContents } = await supabase
            .from('bundle_contents')
            .select('unlockable_id')
            .eq('bundle_id', bundle.id);
          
          const content_count = bundleContents?.length || 0;
          let thumbnail_urls: string[] = [];
          let purchased = false;
          
          // Get up to 8 thumbnails from bundle items
          if (bundleContents && bundleContents.length > 0) {
            const unlockableIds = bundleContents.slice(0, 8).map(c => c.unlockable_id);
            const { data: unlockables } = await supabase
              .from('unlockables')
              .select('media_url, media_type')
              .in('id', unlockableIds);
            
            if (unlockables) {
              thumbnail_urls = unlockables
                .filter(u => u.media_type === 'image' || u.media_type === 'video')
                .map(u => u.media_url);
            }
          }
          
          // Check if bundle is purchased - check transactions table for bundle_id OR pack_id (backward compatibility)
          if (user) {
            console.log('[BUNDLE_OWNERSHIP_CHECK] Checking ownership for bundle:', bundle.id, 'user:', user.id);
            
            // Check for transaction with bundle_id (new format)
            const { data: bundleIdTransaction } = await supabase
              .from('transactions')
              .select('id')
              .eq('customer_id', user.id)
              .eq('bundle_id', bundle.id)
              .eq('status', 'completed')
              .maybeSingle();
            
            // Also check for transaction with pack_id (old format for backward compatibility)
            const { data: packIdTransaction } = await supabase
              .from('transactions')
              .select('id')
              .eq('customer_id', user.id)
              .eq('pack_id', bundle.id)
              .eq('status', 'completed')
              .maybeSingle();
            
            console.log('[BUNDLE_OWNERSHIP_CHECK] bundle_id transaction:', bundleIdTransaction, 'pack_id transaction:', packIdTransaction);
            
            if (bundleIdTransaction || packIdTransaction) {
              purchased = true;
              console.log('[BUNDLE_OWNERSHIP_CHECK] ✓ Bundle OWNED via transaction');
            } else if (bundleContents && bundleContents.length > 0) {
              // Fallback: Check if all items are individually unlocked
              const unlockables = await Promise.all(
                bundleContents.map(async (content) => {
                  const { data } = await supabase
                    .from('unlockables')
                    .select('unlocked_by')
                    .eq('id', content.unlockable_id)
                    .single();
                  return data;
                })
              );
              
              purchased = unlockables.every(u => u?.unlocked_by?.includes(user.id));
              console.log('[BUNDLE_OWNERSHIP_CHECK] Fallback unlockables check:', purchased);
            }
          }
          
          return { ...bundle, content_count, thumbnail_urls, purchased };
        })
      );
      setBundles(bundlesWithCounts);
    } catch (error: any) {
      toast({ title: "Error", description: "Could not load creator profile", variant: "destructive" });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to start a conversation", variant: "destructive" });
      navigate('/auth');
      return;
    }
    if (!profile) return;
    navigate(`/messages?creator=${profile.id}`);
  };

  const handleContentClick = (item: ContentItem) => {
    // If user owns content or is subscribed with free access, open viewer directly
    if (user && item.unlocked_by?.includes(user.id)) {
      setViewerContent([item]);
      setContentViewerOpen(true);
      return;
    }
    // Subscriber has free access to subscriber-only content
    if (user && isSubscribed && item.free_for_subscribers) {
      setViewerContent([item]);
      setContentViewerOpen(true);
      return;
    }
    // Otherwise show unlock dialog
    setSelectedContent(item);
    setUnlockDialogOpen(true);
  };

  const handleUnlockContent = async () => {
    if (!selectedContent || !user || !profile) return;
    if (selectedContent.unlocked_by?.includes(user.id)) {
      toast({ title: "Already unlocked", description: "You have already purchased this content" });
      return;
    }

    setUnlocking(true);
    try {
      const success = await spend(selectedContent.price, 'content_unlock', `Unlocked: ${selectedContent.title || 'content'}`, profile.id);
      if (!success) {
        toast({ title: "Error", description: "Failed to process payment", variant: "destructive" });
        setUnlocking(false);
        return;
      }

      const updatedUnlockedBy = [...(selectedContent.unlocked_by || []), user.id];
      const { error: unlockErr } = await supabase
        .from('unlockables')
        .update({ unlocked_by: updatedUnlockedBy })
        .eq('id', selectedContent.id);
      if (unlockErr) console.error('Failed to update unlocked_by:', unlockErr.message);

      // Record in transactions table via secure RPC so creator dashboard/analytics reflects this
      const { data: txResult, error: txError } = await supabase.rpc('insert_completed_transaction', {
        p_creator_id: profile.id,
        p_amount: selectedContent.price,
        p_transaction_type: 'unlockable',
      });
      if (txError) console.error('Transaction RPC error:', txError.message);
      if (txResult && !txResult.success) console.error('Transaction failed:', txResult.error);

      toast({ title: "Content unlocked!", description: "You can now view this content in your library" });
      setUnlockDialogOpen(false);
      fetchCreatorData();
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to unlock content", variant: "destructive" });
    } finally {
      setUnlocking(false);
    }
  };

  const handleFundsAdded = (newBalance: number) => {
    // After funds are added, check if we have enough and unlock automatically
    if (selectedContent && newBalance >= selectedContent.price) {
      // Auto-unlock after a brief delay to allow balance to update
      setTimeout(() => {
        handleUnlockContent();
      }, 500);
    }
  };

  const handleBundleClick = async (bundle: Bundle) => {
    // If already purchased, open content viewer directly with bundle contents
    if (bundle.purchased && user) {
      try {
        // Fetch all content in this bundle
        const { data: bundleContents } = await supabase
          .from('bundle_contents')
          .select('unlockable_id')
          .eq('bundle_id', bundle.id);

        if (bundleContents && bundleContents.length > 0) {
          const unlockableIds = bundleContents.map(c => c.unlockable_id);
          const { data: unlockables } = await supabase
            .from('unlockables')
            .select('id, media_url, media_type, title, caption')
            .in('id', unlockableIds);

          if (unlockables && unlockables.length > 0) {
            setViewerContent(unlockables.map(u => ({
              ...u,
              price: 0,
              created_at: '',
              unlocked_by: [user.id]
            })));
            setContentViewerOpen(true);
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching bundle contents:', error);
      }
    }
    
    // Otherwise show purchase dialog
    setSelectedBundle(bundle);
    setBundlePurchaseDialogOpen(true);
  };

  const handlePurchaseBundle = async () => {
    if (!selectedBundle || !user || !profile) return;
    
    // CRITICAL: Check if user already owns this bundle
    if (selectedBundle.purchased) {
      toast({ 
        title: "Already Purchased", 
        description: "You already own this bundle. View it in your vault.",
      });
      setBundlePurchaseDialogOpen(false);
      return;
    }
    
    setPurchasingBundle(true);
    try {
      // Double-check ownership at transaction level to prevent race conditions
      // Check both bundle_id (new) and pack_id (old) for backward compatibility
      console.log('[BUNDLE_PURCHASE] Checking for existing purchase:', selectedBundle.id);
      
      const { data: existingBundleIdTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('customer_id', user.id)
        .eq('bundle_id', selectedBundle.id)
        .eq('status', 'completed')
        .maybeSingle();
      
      const { data: existingPackIdTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('customer_id', user.id)
        .eq('pack_id', selectedBundle.id)
        .eq('status', 'completed')
        .maybeSingle();
      
      console.log('[BUNDLE_PURCHASE] Existing transactions - bundle_id:', existingBundleIdTx, 'pack_id:', existingPackIdTx);
      
      if (existingBundleIdTx || existingPackIdTx) {
        console.log('[BUNDLE_PURCHASE] ✓ Already owned, preventing duplicate purchase');
        toast({ 
          title: "Already Purchased", 
          description: "You already own this bundle.",
        });
        setBundlePurchaseDialogOpen(false);
        fetchCreatorData(); // Refresh to show correct status
        setPurchasingBundle(false);
        return;
      }

      // Check if user has sufficient balance
      if (balance < selectedBundle.price) {
        toast({ 
          title: "Insufficient balance", 
          description: `You need $${selectedBundle.price.toFixed(2)} to purchase this bundle. Your current balance is $${balance.toFixed(2)}.`,
          variant: "destructive" 
        });
        setShowAddFunds(true);
        setPurchasingBundle(false);
        return;
      }

      // Process payment using wallet
      const success = await spend(selectedBundle.price, 'bundle_purchase', `Purchased bundle: ${selectedBundle.title}`, profile.id);
      if (!success) {
        toast({ title: "Error", description: "Failed to process payment", variant: "destructive" });
        setPurchasingBundle(false);
        return;
      }

      // Get all content in the bundle and unlock it
      const { data: bundleContents, error: contentsError } = await supabase
        .from('bundle_contents')
        .select('unlockable_id')
        .eq('bundle_id', selectedBundle.id);

      if (contentsError) throw contentsError;

      // Unlock all items in the bundle
      if (bundleContents && bundleContents.length > 0) {
        for (const content of bundleContents) {
          const { data: unlockable } = await supabase
            .from('unlockables')
            .select('unlocked_by')
            .eq('id', content.unlockable_id)
            .single();

          const currentUnlockedBy = unlockable?.unlocked_by || [];
          if (!currentUnlockedBy.includes(user.id)) {
            const { error: updateErr } = await supabase
              .from('unlockables')
              .update({ unlocked_by: [...currentUnlockedBy, user.id] })
              .eq('id', content.unlockable_id);
            if (updateErr) console.error('Failed to unlock item:', updateErr.message);
          }
        }
      }

      // Record in transactions table via secure RPC
      const { data: txResult, error: txError } = await supabase.rpc('insert_completed_transaction', {
        p_creator_id: profile.id,
        p_amount: selectedBundle.price,
        p_transaction_type: 'unlockable',
        p_bundle_id: selectedBundle.id,
      });
      if (txError) console.error('Transaction RPC error:', txError.message);
      if (txResult && !txResult.success) console.error('Transaction failed:', txResult.error);

      // Send notification to creator
      try {
        const { data: customerProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();
        
        const customerName = customerProfile?.display_name || 'A customer';
        
        await supabase.functions.invoke('create-notification', {
          body: {
            userId: profile.id,
            type: 'bundle_purchase',
            title: 'Bundle Purchased! 🎉',
            message: `${customerName} purchased your bundle "${selectedBundle.title}" for $${selectedBundle.price.toFixed(2)}`,
            link: '/earnings',
          },
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
        // Non-fatal, continue
      }

      toast({ title: "Bundle purchased!", description: "All content in this bundle is now unlocked" });
      setBundlePurchaseDialogOpen(false);
      setSelectedBundle(null);
      fetchCreatorData();
    } catch (error: any) {
      console.error('Error purchasing bundle:', error);
      toast({ title: "Error", description: "Failed to purchase bundle", variant: "destructive" });
    } finally {
      setPurchasingBundle(false);
    }
  };

  const loadMoreContent = () => {
    setItemsToShow(prev => prev + 20);
    fetchCreatorData();
  };

  const getFilteredContent = () => {
    switch (activeFolder) {
      case 'photos': return content.filter(item => item.media_type === 'image');
      case 'videos': return content.filter(item => item.media_type === 'video');
      case 'bundles': return bundles;
      default: return [...content, ...bundles].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  };

  const filteredItems = getFilteredContent();
  const isContentItem = (item: any): item is ContentItem => 'media_type' in item;
  const counts = {
    all: content.length + bundles.length,
    photos: content.filter(c => c.media_type === 'image').length,
    videos: content.filter(c => c.media_type === 'video').length,
    bundles: bundles.length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 h-14 max-w-screen-lg mx-auto">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <h1 className="text-lg font-semibold">Profile</h1>
            <div className="w-10" />
          </div>
        </div>
        <div className="max-w-screen-lg mx-auto px-4 py-6">
          <ContentGridSkeleton />
        </div>
        {user && <BottomNavigation />}
      </div>
    );
  }
  if (!profile) return null;

  // Check if content is accessible: user owns it OR (user is subscribed AND content is free for subscribers)
  const isUnlocked = (item: ContentItem) => {
    if (!user) return false;
    // Already purchased
    if (item.unlocked_by?.includes(user.id)) return true;
    // Subscriber has free access
    if (isSubscribed && item.free_for_subscribers) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-screen-lg mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-lg font-semibold">Profile</h1>
          <div className="w-10" />
        </div>
      </div>
      {/* Bottom nav for logged-in users — public profile page is outside AppLayout */}
      {user && <BottomNavigation />}
      <div className="max-w-screen-lg mx-auto px-4 py-6">
        <div className="flex flex-col items-center text-center mb-6">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="text-2xl">{profile.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold mb-1">{profile.display_name}</h2>
          <p className="text-muted-foreground mb-2">@{profile.username}</p>
          {profile.bio && <p className="text-sm text-muted-foreground max-w-md mb-4">{profile.bio}</p>}
          
          {/* Social Links */}
          {Object.keys(socialLinks).length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mb-4">
              {Object.entries(socialLinks).map(([platform, url]) => {
                const platformNames: Record<string, string> = {
                  facebook: 'Facebook',
                  instagram: 'Instagram', 
                  tiktok: 'TikTok',
                  youtube: 'YouTube',
                  twitch: 'Twitch',
                  twitter: 'X (Twitter)',
                  snapchat: 'Snapchat',
                  other: 'Website'
                };
                // Extract username from URL
                const getHandle = (url: string) => {
                  try {
                    const urlObj = new URL(url);
                    const path = urlObj.pathname.replace(/^\/+|\/+$/g, '');
                    return path.replace('@', '') || urlObj.hostname;
                  } catch {
                    return url;
                  }
                };
                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span className="font-medium">{platformNames[platform]}:</span>
                    <span>{getHandle(url)}</span>
                  </a>
                );
              })}
            </div>
          )}
          
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="secondary">${pricePerMessage} / message</Badge>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full max-w-md justify-center mt-4">
            <Button onClick={handleStartConversation} size="lg">
              <MessageCircle className="h-4 w-4 mr-2" />Chat
            </Button>
            {/* Subscribe Button - always render, component handles visibility internally */}
            {creatorUserId && (
              <SubscriptionTiersDisplay creatorId={creatorUserId} creatorName={profile.display_name} />
            )}
            {user?.id && creatorUserId && user.id !== creatorUserId && !isFollowing && (
              <Button 
                onClick={toggleFollow} 
                disabled={followLoading}
                size="lg"
                variant="outline"
              >
                {followLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><UserPlus className="h-4 w-4 mr-2" />Follow</>
                )}
              </Button>
            )}
          </div>
        </div>
        <Tabs value={activeFolder} onValueChange={(v) => setActiveFolder(v as FolderType)} className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="photos"><ImageIcon className="h-4 w-4 mr-1" />Photos ({counts.photos})</TabsTrigger>
            <TabsTrigger value="videos"><VideoIcon className="h-4 w-4 mr-1" />Videos ({counts.videos})</TabsTrigger>
            <TabsTrigger value="bundles"><Package className="h-4 w-4 mr-1" />Bundles ({counts.bundles})</TabsTrigger>
          </TabsList>
        </Tabs>
        {filteredItems.length === 0 ? (
          <div className="text-center py-12"><p className="text-muted-foreground">This creator hasn't posted any content yet. Check back soon!</p></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.slice(0, itemsToShow).map((item) => {
              const isContent = isContentItem(item);
              const unlocked = isContent ? isUnlocked(item) : false;
              return (
                <Card key={item.id} className="group cursor-pointer overflow-hidden hover:shadow-lg transition-all" onClick={() => isContent ? handleContentClick(item) : handleBundleClick(item)}>
                  <div className="p-4 pb-3 space-y-2">
                    {(isContent ? item.title : item.title) && (
                      <h3 className="font-bold text-base text-primary line-clamp-2 leading-tight">
                        {isContent ? item.title : item.title}
                      </h3>
                    )}
                    {isContent ? (
                      item.caption && <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">{item.caption}</p>
                    ) : (
                      item.description && <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">{item.description}</p>
                    )}
                  </div>
                  <div className="relative aspect-square bg-muted">
                    {isContent ? (
                      <div className="relative w-full h-full">
                      {item.media_type === 'image' || item.media_type === 'video' ? (
                          <img src={item.media_url} alt={item.title || 'Content'} className={`w-full h-full object-cover ${!unlocked ? 'blur-2xl' : ''}`} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5"><Lock className="h-12 w-12 text-primary" /></div>
                        )}
                        {!unlocked && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Lock className="h-10 w-10 text-white" /></div>}
                        {item.media_type === 'video' && <div className="absolute top-2 right-2"><Badge variant="secondary"><VideoIcon className="h-3 w-3 mr-1" />Video</Badge></div>}
                      </div>
                    ) : (
                      <div className="relative w-full h-full">
                        {item.thumbnail_urls && item.thumbnail_urls.length > 0 ? (
                          <>
                            <div className={`w-full h-full grid ${item.thumbnail_urls.length === 1 ? 'grid-cols-1' : item.thumbnail_urls.length === 2 ? 'grid-cols-2' : item.thumbnail_urls.length <= 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-3 grid-rows-3'} gap-0.5`}>
                              {item.thumbnail_urls.slice(0, 8).map((url, idx) => (
                                <div key={idx} className="relative w-full h-full overflow-hidden">
                                  <img 
                                    src={url} 
                                    alt={`Bundle item ${idx + 1}`} 
                                    className={`w-full h-full object-cover ${(!item.purchased && profile?.id !== user?.id) ? 'blur-2xl' : ''}`} 
                                  />
                                </div>
                              ))}
                            </div>
                            {!item.purchased && profile?.id !== user?.id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <Lock className="h-10 w-10 text-white" />
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <Package className="h-12 w-12 text-primary" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary"><Package className="h-3 w-3 mr-1" />Bundle · {item.content_count}</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 pt-2">
                    <div className="flex items-center justify-between">
                      {!isContent && item.discount_percentage && item.discount_percentage > 0 ? (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm line-through text-muted-foreground">
                              ${calculateOriginalPrice(item.price, item.discount_percentage).toFixed(2)}
                            </span>
                            <Badge variant="destructive" className="text-xs">{item.discount_percentage}% OFF</Badge>
                          </div>
                          <span className="text-lg font-bold text-primary">${item.price.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-primary">${item.price.toFixed(2)}</span>
                      )}
                      {isContent && !unlocked && <Badge variant="outline" className="text-xs gap-1"><Lock className="h-3 w-3" />Locked</Badge>}
                      {isContent && unlocked && <Badge variant="secondary" className="text-xs">Unlocked</Badge>}
                      {!isContent && item.purchased && <Badge variant="secondary" className="text-xs">Purchased</Badge>}
                      {!isContent && !item.purchased && <Badge variant="outline" className="text-xs gap-1"><Lock className="h-3 w-3" />Locked</Badge>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          
          {/* Load more button */}
          {filteredItems.length > itemsToShow && (
            <div className="flex justify-center mt-8">
              <Button onClick={loadMoreContent} variant="outline" size="lg">
                Load More Content
              </Button>
            </div>
          )}
        </>
        )}
      </div>
      {/* Unlock Dialog - only shown for content user doesn't own */}
      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Unlock Content</DialogTitle></DialogHeader>
          {selectedContent && (
            <div className="space-y-4">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                {selectedContent.media_type === 'image' || selectedContent.media_type === 'video' ? (
                  <img src={selectedContent.media_url} alt={selectedContent.title || 'Content'} className="w-full h-full object-cover blur-2xl" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Lock className="h-16 w-16 text-muted-foreground" /></div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Lock className="h-16 w-16 text-white" /></div>
              </div>
              {selectedContent.title && <h3 className="font-semibold text-lg">{selectedContent.title}</h3>}
              {selectedContent.caption && <p className="text-sm text-muted-foreground">{selectedContent.caption}</p>}
              <div className="flex items-center justify-between py-4 border-y">
                <span className="text-muted-foreground">Price</span>
                <span className="text-2xl font-bold text-primary">${selectedContent.price.toFixed(2)}</span>
              </div>
              
              {balance >= selectedContent.price ? (
                <Button onClick={handleUnlockContent} disabled={unlocking} className="w-full" size="lg">
                  {unlocking ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Unlocking...</>) : (<>Unlock for ${selectedContent.price.toFixed(2)}</>)}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg bg-destructive/10 p-4 text-center"><p className="text-sm text-destructive font-medium">Insufficient balance. You need ${(selectedContent.price - balance).toFixed(2)} more.</p></div>
                  <Button onClick={() => { setUnlockDialogOpen(false); setShowAddFunds(true); }} variant="outline" className="w-full">Add Funds</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bundle Purchase Dialog */}
      <Dialog open={bundlePurchaseDialogOpen} onOpenChange={setBundlePurchaseDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Purchase Bundle</DialogTitle></DialogHeader>
          {selectedBundle && (
            <div className="space-y-4">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                {selectedBundle.thumbnail_url ? (
                  <>
                    <img src={selectedBundle.thumbnail_url} alt={selectedBundle.title} className="w-full h-full object-cover blur-[20px]" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Lock className="h-16 w-16 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-16 w-16 text-primary" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{selectedBundle.title}</h3>
                {selectedBundle.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedBundle.description}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  This bundle contains {selectedBundle.content_count} exclusive items
                </p>
              </div>
              <div className="py-4 border-y space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Price</span>
                  {selectedBundle.discount_percentage && selectedBundle.discount_percentage > 0 ? (
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-sm line-through text-muted-foreground">
                          ${calculateOriginalPrice(selectedBundle.price, selectedBundle.discount_percentage).toFixed(2)}
                        </span>
                        <Badge variant="destructive" className="text-xs">{selectedBundle.discount_percentage}% OFF</Badge>
                      </div>
                      <div className="text-2xl font-bold text-primary">${selectedBundle.price.toFixed(2)}</div>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-primary">${selectedBundle.price.toFixed(2)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Your balance</span>
                  <span className="font-semibold">${balance.toFixed(2)}</span>
                </div>
              </div>
              
              {selectedBundle.purchased ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-primary/10 p-4 text-center">
                    <Badge variant="secondary" className="text-sm mb-2">Already Purchased</Badge>
                    <p className="text-sm text-muted-foreground">You already own this bundle. View it in your vault.</p>
                  </div>
                  <Button 
                    onClick={() => { 
                      setBundlePurchaseDialogOpen(false); 
                      navigate('/vault'); 
                    }} 
                    className="w-full"
                  >
                    View in My Vault
                  </Button>
                </div>
              ) : balance >= selectedBundle.price ? (
                <Button onClick={handlePurchaseBundle} disabled={purchasingBundle} className="w-full" size="lg">
                  {purchasingBundle ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                  ) : (
                    <>Purchase Bundle for ${selectedBundle.price.toFixed(2)}</>
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg bg-destructive/10 p-4 text-center">
                    <p className="text-sm text-destructive font-medium">
                      Insufficient balance. You need ${(selectedBundle.price - balance).toFixed(2)} more.
                    </p>
                  </div>
                  <Button 
                    onClick={() => { 
                      setBundlePurchaseDialogOpen(false); 
                      setShowAddFunds(true); 
                    }} 
                    variant="outline" 
                    className="w-full"
                  >
                    Add Funds
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Funds Dialog */}
      <AddFundsDialog
        open={showAddFunds}
        onOpenChange={setShowAddFunds}
        requiredAmount={selectedContent?.price}
        currentBalance={balance}
        onSuccess={handleFundsAdded}
      />

      {/* Content Viewer for owned content */}
      <ContentViewer
        open={contentViewerOpen}
        onOpenChange={setContentViewerOpen}
        content={viewerContent}
        initialIndex={0}
      />
    </div>
  );
};

export default CreatorProfile;
