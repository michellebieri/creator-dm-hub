import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface MessagePack {
  id: string;
  quantity: number;
  price: number;
  discount_percentage: number;
}

export const MessagePackSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [packs, setPacks] = useState<MessagePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPack, setNewPack] = useState({
    quantity: '',
    price: '',
    discount: '',
  });

  useEffect(() => {
    if (!user) return;

    const fetchPacks = async () => {
      try {
        const { data, error } = await supabase
          .from('message_packs')
          .select('*')
          .eq('creator_id', user.id)
          .eq('is_active', true)
          .order('quantity', { ascending: true });

        if (error) throw error;
        setPacks(data || []);
      } catch (error) {
        console.error('Error fetching packs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPacks();
  }, [user]);

  const handleCreatePack = async () => {
    if (!user || !newPack.quantity || !newPack.price) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('message_packs').insert({
        creator_id: user.id,
        quantity: parseInt(newPack.quantity),
        price: parseFloat(newPack.price),
        discount_percentage: parseFloat(newPack.discount || '0'),
      });

      if (error) throw error;

      toast({
        title: "Pack created",
        description: "Message pack added successfully",
      });

      setNewPack({ quantity: '', price: '', discount: '' });
      
      // Refresh packs
      const { data } = await supabase
        .from('message_packs')
        .select('*')
        .eq('creator_id', user.id)
        .eq('is_active', true)
        .order('quantity', { ascending: true });
      
      setPacks(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to create pack",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePack = async (packId: string) => {
    try {
      const { error } = await supabase
        .from('message_packs')
        .update({ is_active: false })
        .eq('id', packId);

      if (error) throw error;

      setPacks(packs.filter((p) => p.id !== packId));
      toast({
        title: "Pack deleted",
        description: "Message pack removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete pack",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <Loader2 className="w-6 h-6 animate-spin" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Message Pack Settings</h2>
        <p className="text-muted-foreground">
          Configure message credit packs for your customers
        </p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Create New Pack</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="10"
              value={newPack.quantity}
              onChange={(e) => setNewPack({ ...newPack, quantity: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              placeholder="50.00"
              value={newPack.price}
              onChange={(e) => setNewPack({ ...newPack, price: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="discount">Discount (%)</Label>
            <Input
              id="discount"
              type="number"
              placeholder="0"
              value={newPack.discount}
              onChange={(e) => setNewPack({ ...newPack, discount: e.target.value })}
            />
          </div>
        </div>
        <Button
          onClick={handleCreatePack}
          disabled={saving || !newPack.quantity || !newPack.price}
          className="mt-4"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Create Pack
            </>
          )}
        </Button>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Active Packs</h3>
        {packs.length === 0 ? (
          <p className="text-muted-foreground">No message packs created yet</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {packs.map((pack) => (
              <Card key={pack.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-xl font-bold">{pack.quantity} messages</div>
                    <div className="text-lg text-muted-foreground">
                      ${pack.price.toFixed(2)}
                    </div>
                    {pack.discount_percentage > 0 && (
                      <div className="text-sm text-green-600">
                        {pack.discount_percentage}% off
                      </div>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeletePack(pack.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
