import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MessagingSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    pay_per_message: true,
    price_per_message: 3,
    bulk_message_amount: 30,
    bulk_message_price: 45,
    first_three_free: false,
    ai_messaging: false,
    gift_messages: true,
    gift_message_count: 5,
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('creator_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setSettings({
          pay_per_message: data.is_accepting_messages || true,
          price_per_message: data.price_per_message || 3,
          bulk_message_amount: (data as any).bulk_message_amount || 30,
          bulk_message_price: (data as any).bulk_message_price || 45,
          first_three_free: (data as any).first_three_free || false,
          ai_messaging: (data as any).ai_messaging || false,
          gift_messages: (data as any).gift_messages || true,
          gift_message_count: (data as any).gift_message_count || 5,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('creator_settings')
        .update({
          is_accepting_messages: settings.pay_per_message,
          price_per_message: settings.price_per_message,
          bulk_message_amount: settings.bulk_message_amount,
          bulk_message_price: settings.bulk_message_price,
          first_three_free: settings.first_three_free,
          ai_messaging: settings.ai_messaging,
          gift_messages: settings.gift_messages,
          gift_message_count: settings.gift_message_count,
        })
        .eq('user_id', user?.id);

      if (error) throw error;
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
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
          <h1 className="text-lg font-semibold">Messaging</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Messaging Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="pay-per-message">Pay per message</Label>
              <Switch
                id="pay-per-message"
                checked={settings.pay_per_message}
                onCheckedChange={(checked) => setSettings({ ...settings, pay_per_message: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price-per-message">Pricing per message</Label>
              <Input
                id="price-per-message"
                type="number"
                value={settings.price_per_message}
                onChange={(e) => setSettings({ ...settings, price_per_message: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-amount">Bulk message amount</Label>
              <Input
                id="bulk-amount"
                type="number"
                value={settings.bulk_message_amount}
                onChange={(e) => setSettings({ ...settings, bulk_message_amount: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-price">Bulk message price</Label>
              <Input
                id="bulk-price"
                type="number"
                value={settings.bulk_message_price}
                onChange={(e) => setSettings({ ...settings, bulk_message_price: parseFloat(e.target.value) })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="first-three-free">First 3 messages are always free</Label>
              <Switch
                id="first-three-free"
                checked={settings.first_three_free}
                onCheckedChange={(checked) => setSettings({ ...settings, first_three_free: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ai-messaging">Using AI for messaging</Label>
              <Switch
                id="ai-messaging"
                checked={settings.ai_messaging}
                onCheckedChange={(checked) => setSettings({ ...settings, ai_messaging: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="gift-messages">Gift messages for every unlock</Label>
              <Switch
                id="gift-messages"
                checked={settings.gift_messages}
                onCheckedChange={(checked) => setSettings({ ...settings, gift_messages: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gift-count">Number of messages</Label>
              <Input
                id="gift-count"
                type="number"
                value={settings.gift_message_count}
                onChange={(e) => setSettings({ ...settings, gift_message_count: parseInt(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-2">
            <button
              onClick={() => navigate('/welcome-message/1')}
              className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <span>First welcome message</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate('/welcome-message/2')}
              className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <span>Second welcome message</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate('/welcome-message/3')}
              className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <span>Third welcome message</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default MessagingSettings;
