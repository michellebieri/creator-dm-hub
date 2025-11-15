import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Tier {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_interval: string;
  features: string[];
  is_active: boolean;
}

export const SubscriptionTiersManager = () => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    billing_interval: 'monthly',
    features: '',
  });

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('creator_id', user.id)
        .order('price', { ascending: true });

      if (error) throw error;
      setTiers((data || []).map(tier => ({
        ...tier,
        features: Array.isArray(tier.features) ? tier.features.map(f => String(f)) : [],
      })) as Tier[]);
    } catch (error: any) {
      toast({
        title: "Failed to load tiers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const tierData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        billing_interval: formData.billing_interval,
        features: formData.features.split('\n').filter(f => f.trim()),
        creator_id: user.id,
      };

      if (editingTier) {
        const { error } = await supabase
          .from('subscription_tiers')
          .update(tierData)
          .eq('id', editingTier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subscription_tiers')
          .insert([tierData]);
        if (error) throw error;
      }

      toast({
        title: editingTier ? "Tier updated" : "Tier created",
        description: "Subscription tier saved successfully",
      });

      setDialogOpen(false);
      setEditingTier(null);
      setFormData({ name: '', description: '', price: '', billing_interval: 'monthly', features: '' });
      fetchTiers();
    } catch (error: any) {
      toast({
        title: "Failed to save tier",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (tier: Tier) => {
    setEditingTier(tier);
    setFormData({
      name: tier.name,
      description: tier.description || '',
      price: tier.price.toString(),
      billing_interval: tier.billing_interval,
      features: (tier.features || []).join('\n'),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tier?')) return;

    try {
      const { error } = await supabase
        .from('subscription_tiers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Tier deleted",
        description: "Subscription tier removed successfully",
      });
      fetchTiers();
    } catch (error: any) {
      toast({
        title: "Failed to delete tier",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Subscription Tiers</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tier
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier) => (
          <Card key={tier.id} className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{tier.name}</h3>
                  <p className="text-2xl font-bold mt-2">
                    ${tier.price}
                    <span className="text-sm text-muted-foreground">/{tier.billing_interval}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(tier)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(tier.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {tier.description && <p className="text-sm text-muted-foreground">{tier.description}</p>}
              {tier.features && tier.features.length > 0 && (
                <ul className="space-y-2">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="text-sm flex items-center">
                      <span className="mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTier ? 'Edit' : 'Create'} Subscription Tier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tier Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Premium"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this tier includes..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="9.99"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>Billing Interval</Label>
                <Select
                  value={formData.billing_interval}
                  onValueChange={(value) => setFormData({ ...formData, billing_interval: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Features (one per line)</Label>
              <Textarea
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="Exclusive content&#10;Priority support&#10;Monthly video calls"
                rows={5}
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              {editingTier ? 'Update' : 'Create'} Tier
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
