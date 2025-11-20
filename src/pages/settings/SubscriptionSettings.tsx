import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SubscriptionSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tier, setTier] = useState({
    id: '',
    title: 'Subscription tier 3',
    discount_comment: '',
    is_active: false,
    free_messages_per_month: 20,
    unlimited_messages: false,
    monthly_price: 9.99,
    discount_percentage: 0,
  });

  useEffect(() => {
    if (user) {
      fetchTier();
    }
  }, [user]);

  const fetchTier = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('creator_id', user?.id)
        .limit(1)
        .single();

      if (data) {
        setTier({
          id: data.id,
          title: data.name || 'Subscription tier 3',
          discount_comment: (data as any).discount_comment || '',
          is_active: data.is_active,
          free_messages_per_month: (data as any).free_messages_per_month || 20,
          unlimited_messages: (data as any).unlimited_messages || false,
          monthly_price: data.price || 9.99,
          discount_percentage: (data as any).discount_percentage || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching tier:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (tier.id) {
        const { error } = await supabase
          .from('subscription_tiers')
          .update({
            name: tier.title,
            discount_comment: tier.discount_comment,
            is_active: tier.is_active,
            free_messages_per_month: tier.free_messages_per_month,
            unlimited_messages: tier.unlimited_messages,
            price: tier.monthly_price,
            discount_percentage: tier.discount_percentage,
          })
          .eq('id', tier.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subscription_tiers')
          .insert({
            creator_id: user?.id,
            name: tier.title,
            discount_comment: tier.discount_comment,
            is_active: tier.is_active,
            free_messages_per_month: tier.free_messages_per_month,
            unlimited_messages: tier.unlimited_messages,
            price: tier.monthly_price,
            discount_percentage: tier.discount_percentage,
          });

        if (error) throw error;
      }
      toast.success('Subscription tier saved successfully');
    } catch (error) {
      console.error('Error saving tier:', error);
      toast.error('Failed to save subscription tier');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Subscription</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Tier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Subscription title</Label>
              <Input
                id="title"
                value={tier.title}
                onChange={(e) => setTier({ ...tier, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount-comment">Discount comment</Label>
              <Input
                id="discount-comment"
                value={tier.discount_comment}
                onChange={(e) => setTier({ ...tier, discount_comment: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is-active">Active subscription tier</Label>
              <Switch
                id="is-active"
                checked={tier.is_active}
                onCheckedChange={(checked) => setTier({ ...tier, is_active: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="free-messages">Free messages per month</Label>
              <Input
                id="free-messages"
                type="number"
                value={tier.free_messages_per_month}
                onChange={(e) => setTier({ ...tier, free_messages_per_month: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="unlimited">Unlimited messages</Label>
              <Switch
                id="unlimited"
                checked={tier.unlimited_messages}
                onCheckedChange={(checked) => setTier({ ...tier, unlimited_messages: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Monthly subscription price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={tier.monthly_price}
                onChange={(e) => setTier({ ...tier, monthly_price: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Discount percentage</Label>
              <Select
                value={tier.discount_percentage.toString()}
                onValueChange={(value) => setTier({ ...tier, discount_percentage: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 5, 10, 15, 20, 25, 30].map((value) => (
                    <SelectItem key={value} value={value.toString()}>
                      {value}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>

        <Button variant="destructive" className="w-full">
          Delete tier
        </Button>
      </div>
    </div>
  );
};

export default SubscriptionSettings;
