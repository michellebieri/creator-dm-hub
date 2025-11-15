import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Folder, Image, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';

interface Collection {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  collection_items: { id: string }[];
}

export default function CollectionsManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_public: false,
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchCollections();
  }, [user]);

  const fetchCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('content_collections')
        .select(`
          *,
          collection_items (id)
        `)
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load collections",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreate = async () => {
    try {
      const { error } = await supabase
        .from('content_collections')
        .insert([{
          creator_id: user!.id,
          ...formData,
        }]);

      if (error) throw error;

      toast({
        title: "Collection created",
        description: "Your collection has been created",
      });

      setDialogOpen(false);
      setFormData({ title: '', description: '', is_public: false });
      fetchCollections();
    } catch (error: any) {
      toast({
        title: "Failed to create collection",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection?')) return;

    try {
      const { error } = await supabase
        .from('content_collections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Collection deleted" });
      fetchCollections();
    } catch (error: any) {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Content Collections</h1>
              <p className="text-muted-foreground">
                Organize your content into collections
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Collection
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {collections.map((collection) => (
              <Card key={collection.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <Folder className="h-8 w-8 text-primary" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(collection.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{collection.title}</h3>
                    {collection.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {collection.description}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {collection.collection_items.length} items
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      collection.is_public ? 'bg-success/10 text-success' : 'bg-muted'
                    }`}>
                      {collection.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Collection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Summer Photoshoot"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe this collection..."
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked as boolean })}
                  />
                  <Label htmlFor="is_public" className="cursor-pointer">
                    Make this collection public
                  </Label>
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Create Collection
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
