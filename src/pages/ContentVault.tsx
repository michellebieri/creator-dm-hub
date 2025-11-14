import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image, Video, Music, FileText, Trash2, DollarSign, Users, Edit } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentBundleManager } from '@/components/ContentBundleManager';
import { Checkbox } from '@/components/ui/checkbox';

interface Unlockable {
  id: string;
  media_url: string;
  media_type: string;
  price: number;
  created_at: string;
  unlocked_by: string[] | null;
  message_id: string;
}

export default function ContentVault() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unlockables, setUnlockables] = useState<Unlockable[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPrice, setUploadPrice] = useState('9.99');
  const [uploadType, setUploadType] = useState<'image' | 'video' | 'audio' | 'document'>('image');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUnlockables();
    }
  }, [user]);

  const fetchUnlockables = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('unlockables')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unlockables:', error);
      return;
    }

    setUnlockables(data || []);
  };

  const handleUpload = async () => {
    if (!uploadFile || !user) return;

    setUploading(true);
    try {
      // Create a placeholder conversation for vault uploads
      let vaultConversationId = localStorage.getItem(`vault_conversation_${user.id}`);
      
      if (!vaultConversationId) {
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            creator_id: user.id,
            customer_id: user.id,
          })
          .select('id')
          .single();

        if (convError) throw convError;
        vaultConversationId = conversation.id;
        localStorage.setItem(`vault_conversation_${user.id}`, vaultConversationId);
      }

      // Upload file to storage
      const fileName = `vault/${user.id}/${Date.now()}-${uploadFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('unlockables')
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('unlockables')
        .getPublicUrl(fileName);

      // Create message
      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: vaultConversationId,
          sender_id: user.id,
          content: `Vault upload: ${uploadFile.name}`,
          message_type: 'unlockable',
        })
        .select('id')
        .single();

      if (msgError) throw msgError;

      // Create unlockable
      const { error: unlockError } = await supabase
        .from('unlockables')
        .insert({
          creator_id: user.id,
          message_id: message.id,
          media_url: publicUrl,
          media_type: uploadType,
          price: parseFloat(uploadPrice),
        });

      if (unlockError) throw unlockError;

      toast({
        title: 'Success',
        description: 'Content uploaded to vault',
      });

      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadPrice('9.99');
      fetchUnlockables();
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, mediaUrl: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      // Extract file path from URL
      const urlParts = mediaUrl.split('/unlockables/');
      if (urlParts[1]) {
        const filePath = urlParts[1].split('?')[0];
        await supabase.storage.from('unlockables').remove([filePath]);
      }

      const { error } = await supabase
        .from('unlockables')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Content removed from vault',
      });

      fetchUnlockables();
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedItems.size} items?`)) return;

    let successCount = 0;
    for (const id of Array.from(selectedItems)) {
      const item = unlockables.find(u => u.id === id);
      if (!item) continue;

      try {
        const urlParts = item.media_url.split('/unlockables/');
        if (urlParts[1]) {
          const filePath = urlParts[1].split('?')[0];
          await supabase.storage.from('unlockables').remove([filePath]);
        }

        const { error } = await supabase
          .from('unlockables')
          .delete()
          .eq('id', id);

        if (!error) successCount++;
      } catch (error) {
        console.error('Delete error:', error);
      }
    }

    toast({
      title: 'Deleted',
      description: `${successCount} items removed`,
    });

    setSelectedItems(new Set());
    setBulkMode(false);
    fetchUnlockables();
  };

  const handleBulkPriceUpdate = async () => {
    const newPrice = prompt('Enter new price for selected items:');
    if (!newPrice || isNaN(parseFloat(newPrice))) return;

    const price = parseFloat(newPrice);
    const ids = Array.from(selectedItems);

    const { error } = await supabase
      .from('unlockables')
      .update({ price })
      .in('id', ids);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Updated',
      description: `Price updated for ${ids.length} items`,
    });

    setSelectedItems(new Set());
    setBulkMode(false);
    fetchUnlockables();
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredUnlockables.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredUnlockables.map(u => u.id)));
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-5 w-5" />;
      case 'video': return <Video className="h-5 w-5" />;
      case 'audio': return <Music className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const filteredUnlockables = unlockables.filter(u => 
    filterType === 'all' || u.media_type === filterType
  );

  const totalRevenue = unlockables.reduce((sum, u) => 
    sum + (u.unlocked_by?.length || 0) * u.price, 0
  );

  const totalUnlocks = unlockables.reduce((sum, u) => 
    sum + (u.unlocked_by?.length || 0), 0
  );

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Content Vault</h1>
            <p className="text-muted-foreground">Manage your premium unlockable content</p>
          </div>
          
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Content
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload New Content</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Content Type</Label>
                  <Select value={uploadType} onValueChange={(v: any) => setUploadType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={uploadPrice}
                    onChange={(e) => setUploadPrice(e.target.value)}
                  />
                </div>

                <div>
                  <Label>File</Label>
                  <Input
                    type="file"
                    accept={
                      uploadType === 'image' ? 'image/*' :
                      uploadType === 'video' ? 'video/*' :
                      uploadType === 'audio' ? 'audio/*' : '*'
                    }
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </div>

                <Button 
                  onClick={handleUpload} 
                  disabled={!uploadFile || uploading}
                  className="w-full"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Content</p>
                <p className="text-2xl font-bold">{unlockables.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Unlocks</p>
                <p className="text-2xl font-bold">{totalUnlocks}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>

        {user?.id && (
          <ContentBundleManager creatorId={user.id} unlockables={unlockables} />
        )}

        <Tabs value={filterType} onValueChange={setFilterType} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="image">Images</TabsTrigger>
              <TabsTrigger value="video">Videos</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="document">Documents</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button
                variant={bulkMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setBulkMode(!bulkMode);
                  if (bulkMode) setSelectedItems(new Set());
                }}
              >
                {bulkMode ? `Cancel (${selectedItems.size})` : 'Bulk Actions'}
              </Button>
              {bulkMode && selectedItems.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                  >
                    {selectedItems.size === filteredUnlockables.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkPriceUpdate}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Update Price
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedItems.size})
                  </Button>
                </>
              )}
            </div>
          </div>

          <TabsContent value={filterType}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUnlockables.length === 0 ? (
                <Card className="p-8 col-span-full">
                  <div className="text-center text-muted-foreground">
                    <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No content yet. Upload your first premium content!</p>
                  </div>
                </Card>
              ) : (
                filteredUnlockables.map((item) => (
                  <Card key={item.id} className="overflow-hidden relative">
                    {bulkMode && (
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                          className="bg-background"
                        />
                      </div>
                    )}
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      {item.media_type === 'image' ? (
                        <img 
                          src={item.media_url} 
                          alt="Content preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-muted-foreground">
                          {getMediaIcon(item.media_type)}
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          {getMediaIcon(item.media_type)}
                          <span className="ml-1 capitalize">{item.media_type}</span>
                        </Badge>
                        <Badge variant="outline">${item.price}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.unlocked_by?.length || 0} unlock{item.unlocked_by?.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {!bulkMode && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => handleDelete(item.id, item.media_url)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
