import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Package, Plus, Trash2, Edit, DollarSign } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Unlockable {
  id: string;
  media_url: string;
  media_type: string;
  price: number;
  created_at: string;
}

interface Bundle {
  id: string;
  title: string;
  description: string | null;
  price: number;
  discount_percentage: number;
  is_active: boolean;
  thumbnail_url: string | null;
  created_at: string;
  content_count?: number;
}

interface ContentBundleManagerProps {
  creatorId: string;
  unlockables: Unlockable[];
}

export function ContentBundleManager({ creatorId, unlockables }: ContentBundleManagerProps) {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('0');

  useEffect(() => {
    fetchBundles();
  }, [creatorId]);

  const fetchBundles = async () => {
    const { data, error } = await supabase
      .from('content_bundles')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bundles:', error);
      return;
    }

    // Fetch content count for each bundle
    const bundlesWithCounts = await Promise.all(
      (data || []).map(async (bundle) => {
        const { count } = await supabase
          .from('bundle_contents')
          .select('*', { count: 'exact', head: true })
          .eq('bundle_id', bundle.id);

        return { ...bundle, content_count: count || 0 };
      })
    );

    setBundles(bundlesWithCounts);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setDiscountPercentage('0');
    setSelectedContent(new Set());
    setEditingId(null);
  };

  const handleEdit = async (bundle: Bundle) => {
    setEditingId(bundle.id);
    setTitle(bundle.title);
    setDescription(bundle.description || '');
    setPrice(bundle.price.toString());
    setDiscountPercentage(bundle.discount_percentage.toString());

    // Fetch bundle contents
    const { data } = await supabase
      .from('bundle_contents')
      .select('unlockable_id')
      .eq('bundle_id', bundle.id);

    if (data) {
      setSelectedContent(new Set(data.map(item => item.unlockable_id)));
    }

    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!title || !price || selectedContent.size === 0) {
      toast({
        title: 'Error',
        description: 'Title, price, and at least one content item are required',
        variant: 'destructive',
      });
      return;
    }

    const bundleData = {
      creator_id: creatorId,
      title,
      description: description || null,
      price: parseFloat(price),
      discount_percentage: parseFloat(discountPercentage),
    };

    if (editingId) {
      // Update bundle
      const { error: updateError } = await supabase
        .from('content_bundles')
        .update(bundleData)
        .eq('id', editingId);

      if (updateError) {
        toast({
          title: 'Error',
          description: updateError.message,
          variant: 'destructive',
        });
        return;
      }

      // Update bundle contents
      await supabase
        .from('bundle_contents')
        .delete()
        .eq('bundle_id', editingId);

      const contents = Array.from(selectedContent).map((unlockableId, index) => ({
        bundle_id: editingId,
        unlockable_id: unlockableId,
        sort_order: index,
      }));

      await supabase.from('bundle_contents').insert(contents);

      toast({
        title: 'Updated',
        description: 'Bundle updated successfully',
      });
    } else {
      // Create new bundle
      const { data: newBundle, error: insertError } = await supabase
        .from('content_bundles')
        .insert(bundleData)
        .select('id')
        .single();

      if (insertError || !newBundle) {
        toast({
          title: 'Error',
          description: insertError?.message || 'Failed to create bundle',
          variant: 'destructive',
        });
        return;
      }

      // Add bundle contents
      const contents = Array.from(selectedContent).map((unlockableId, index) => ({
        bundle_id: newBundle.id,
        unlockable_id: unlockableId,
        sort_order: index,
      }));

      await supabase.from('bundle_contents').insert(contents);

      toast({
        title: 'Created',
        description: 'Bundle created successfully',
      });
    }

    fetchBundles();
    setShowDialog(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bundle? This will not delete the individual content items.')) return;

    const { error } = await supabase
      .from('content_bundles')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Deleted',
      description: 'Bundle deleted successfully',
    });

    fetchBundles();
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('content_bundles')
      .update({ is_active: !currentState })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    fetchBundles();
  };

  const toggleContentSelection = (id: string) => {
    setSelectedContent(prev => {
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
    const selectedItems = unlockables.filter(u => selectedContent.has(u.id));
    return selectedItems.reduce((sum, item) => sum + item.price, 0);
  };

  const calculateDiscount = () => {
    const original = calculateOriginalPrice();
    const bundlePrice = parseFloat(price) || 0;
    if (original === 0) return 0;
    return ((original - bundlePrice) / original * 100).toFixed(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Content Bundles</h2>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Bundle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Create'} Content Bundle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Bundle Title</Label>
                <Input
                  placeholder="e.g., Premium Photo Pack"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe what's included in this bundle..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bundle Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="19.99"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  {selectedContent.size > 0 && price && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Original: ${calculateOriginalPrice().toFixed(2)} • Save {calculateDiscount()}%
                    </p>
                  )}
                </div>
                <div>
                  <Label>Discount Badge (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    placeholder="20"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Select Content ({selectedContent.size} selected)</Label>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {unlockables.length === 0 ? (
                    <p className="col-span-2 text-center text-muted-foreground py-4">
                      No content available. Upload content first.
                    </p>
                  ) : (
                    unlockables.map((item) => (
                      <div key={item.id} className="flex items-start gap-2 p-2 border rounded hover:bg-accent">
                        <Checkbox
                          checked={selectedContent.has(item.id)}
                          onCheckedChange={() => toggleContentSelection(item.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="aspect-video bg-muted rounded overflow-hidden mb-1">
                            {item.media_type === 'image' ? (
                              <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs capitalize">
                                {item.media_type}
                              </div>
                            )}
                          </div>
                          <div className="text-xs">
                            <Badge variant="secondary" className="text-xs">${item.price}</Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1" disabled={selectedContent.size === 0}>
                  {editingId ? 'Update Bundle' : 'Create Bundle'}
                </Button>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bundles.length === 0 ? (
          <Card className="col-span-full p-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No bundles yet. Create a bundle to offer multiple items at a discounted price.</p>
          </Card>
        ) : (
          bundles.map((bundle) => (
            <Card key={bundle.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{bundle.title}</h3>
                    {bundle.description && (
                      <p className="text-sm text-muted-foreground mt-1">{bundle.description}</p>
                    )}
                  </div>
                  <Switch
                    checked={bundle.is_active}
                    onCheckedChange={() => toggleActive(bundle.id, bundle.is_active)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-lg">
                    <DollarSign className="h-4 w-4" />
                    {bundle.price.toFixed(2)}
                  </Badge>
                  {bundle.discount_percentage > 0 && (
                    <Badge variant="destructive">
                      {bundle.discount_percentage}% OFF
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {bundle.content_count} items
                  </Badge>
                  {bundle.is_active && <Badge variant="outline">Active</Badge>}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(bundle)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(bundle.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
