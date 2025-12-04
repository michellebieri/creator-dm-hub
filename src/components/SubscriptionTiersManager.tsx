import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Edit, MessageCircle, Lock, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Tier {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_interval: string;
  free_messages_per_month: number | null;
  unlimited_messages: boolean;
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
    free_messages_per_month: '',
    unlimited_messages: false,
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
        unlimited_messages: tier.unlimited_messages || false,
        free_messages_per_month: tier.free_messages_per_month || null,
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
        free_messages_per_month: formData.free_messages_per_month ? parseInt(formData.free_messages_per_month) : null,
        unlimited_messages: formData.unlimited_messages,
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
      setFormData({ 
        name: '', 
        description: '', 
        price: '', 
        billing_interval: 'monthly', 
        free_messages_per_month: '',
        unlimited_messages: false,
      });
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
      free_messages_per_month: tier.free_messages_per_month?.toString() || '',
      unlimited_messages: tier.unlimited_messages || false,
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

  const openCreateDialog = () => {
    setEditingTier(null);
    setFormData({ 
      name: '', 
      description: '', 
      price: '', 
      billing_interval: 'monthly', 
      free_messages_per_month: '',
      unlimited_messages: false,
    });
    setDialogOpen(true);
  };

  const getBenefitsList = (tier: Tier) => {
    const benefits = [];
    if (tier.unlimited_messages) {
      benefits.push({ icon: MessageCircle, text: 'Unlimited free messages' });
    } else if (tier.free_messages_per_month && tier.free_messages_per_month > 0) {
      benefits.push({ icon: MessageCircle, text: `${tier.free_messages_per_month} free messages per month` });
    }
    benefits.push({ icon: Lock, text: 'Access to exclusive content' });
    return benefits;
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Subscription Tiers</h2>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tier
        </Button>
      </div>

      {tiers.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No subscription tiers yet. Create your first tier to start offering subscriptions.</p>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Tier
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(tier)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(tier.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {tier.description && (
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                )}
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Benefits</p>
                  <ul className="space-y-2">
                    {getBenefitsList(tier).map((benefit, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {benefit.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
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
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="9.99"
                  step="0.01"
                  min="0"
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

            <div className="space-y-4 pt-4 border-t border-border">
              <p className="font-medium">Subscriber Benefits</p>
              
              <div className="space-y-2">
                <Label>Free Messages Per Month</Label>
                <Input
                  type="number"
                  value={formData.free_messages_per_month}
                  onChange={(e) => setFormData({ ...formData, free_messages_per_month: e.target.value })}
                  placeholder="e.g., 5"
                  min="0"
                  disabled={formData.unlimited_messages}
                />
                <p className="text-xs text-muted-foreground">
                  Number of free messages subscribers can send each month
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="unlimited_messages"
                  checked={formData.unlimited_messages}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    unlimited_messages: checked as boolean,
                    free_messages_per_month: checked ? '' : formData.free_messages_per_month,
                  })}
                />
                <Label htmlFor="unlimited_messages" className="cursor-pointer">
                  Unlimited free messages
                </Label>
              </div>

              <div className="flex items-center space-x-2 opacity-70">
                <Checkbox id="exclusive_content" checked disabled />
                <Label htmlFor="exclusive_content" className="cursor-pointer">
                  Access to exclusive content
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                All subscribers automatically get access to content marked "Free for Subscribers"
              </p>
            </div>

            <Button onClick={handleSave} className="w-full" disabled={!formData.name || !formData.price}>
              {editingTier ? 'Update' : 'Create'} Tier
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
