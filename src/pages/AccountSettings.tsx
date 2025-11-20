import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MessagingSettings {
  pay_per_message: boolean;
  price_per_message: number;
  bulk_message_amount: number;
  bulk_message_price: number;
  first_three_free: boolean;
  ai_messaging: boolean;
  gift_messages: boolean;
  gift_message_count: number;
}

interface SubscriptionTier {
  id?: string;
  title: string;
  discount_comment: string;
  is_active: boolean;
  free_messages_per_month: number;
  unlimited_messages: boolean;
  monthly_price: number;
  discount_percentage: number;
}

interface BundleSettings {
  is_active: boolean;
  original_price: number;
  discounted_price: number;
  messages_included: number;
}

interface SocialLinks {
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  twitch: string;
  twitter: string;
  snapchat: string;
  other_url: string;
}

const AccountSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [messagingSettings, setMessagingSettings] = useState<MessagingSettings>({
    pay_per_message: true,
    price_per_message: 3,
    bulk_message_amount: 30,
    bulk_message_price: 45,
    first_three_free: false,
    ai_messaging: false,
    gift_messages: true,
    gift_message_count: 5,
  });

  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>({
    title: 'Subscription tier 3',
    discount_comment: '',
    is_active: false,
    free_messages_per_month: 20,
    unlimited_messages: false,
    monthly_price: 9.99,
    discount_percentage: 0,
  });

  const [bundleSettings, setBundleSettings] = useState<BundleSettings>({
    is_active: false,
    original_price: 99,
    discounted_price: 7,
    messages_included: 12,
  });

  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    twitch: '',
    twitter: '',
    snapchat: '',
    other_url: '',
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);

      // Fetch creator settings
      const { data: creatorSettings } = await supabase
        .from('creator_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (creatorSettings) {
        setMessagingSettings({
          pay_per_message: creatorSettings.is_accepting_messages || true,
          price_per_message: creatorSettings.price_per_message || 3,
          bulk_message_amount: (creatorSettings as any).bulk_message_amount || 30,
          bulk_message_price: (creatorSettings as any).bulk_message_price || 45,
          first_three_free: (creatorSettings as any).first_three_free || false,
          ai_messaging: (creatorSettings as any).ai_messaging || false,
          gift_messages: (creatorSettings as any).gift_messages || true,
          gift_message_count: (creatorSettings as any).gift_message_count || 5,
        });

        setSocialLinks({
          facebook: (creatorSettings as any).social_facebook || '',
          instagram: (creatorSettings as any).social_instagram || '',
          tiktok: (creatorSettings as any).social_tiktok || '',
          youtube: (creatorSettings as any).social_youtube || '',
          twitch: (creatorSettings as any).social_twitch || '',
          twitter: (creatorSettings as any).social_twitter || '',
          snapchat: (creatorSettings as any).social_snapchat || '',
          other_url: (creatorSettings as any).social_other_url || '',
        });
      }

      // Fetch subscription tiers
      const { data: tiers } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('creator_id', user?.id)
        .limit(1)
        .single();

      if (tiers) {
        setSubscriptionTier({
          id: tiers.id,
          title: tiers.name || 'Subscription tier 3',
          discount_comment: (tiers as any).discount_comment || '',
          is_active: tiers.is_active,
          free_messages_per_month: (tiers as any).free_messages_per_month || 20,
          unlimited_messages: (tiers as any).unlimited_messages || false,
          monthly_price: tiers.price || 9.99,
          discount_percentage: (tiers as any).discount_percentage || 0,
        });
      }

      // Fetch bundle settings
      const { data: bundles } = await supabase
        .from('content_bundles')
        .select('*')
        .eq('creator_id', user?.id)
        .limit(1)
        .single();

      if (bundles) {
        setBundleSettings({
          is_active: bundles.is_active || false,
          original_price: (bundles as any).original_price || 99,
          discounted_price: bundles.price || 7,
          messages_included: (bundles as any).messages_included || 12,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Save messaging settings and social links
      const { error: settingsError } = await supabase
        .from('creator_settings')
        .upsert({
          user_id: user.id,
          is_accepting_messages: messagingSettings.pay_per_message,
          price_per_message: messagingSettings.price_per_message,
          bulk_message_amount: messagingSettings.bulk_message_amount,
          bulk_message_price: messagingSettings.bulk_message_price,
          first_three_free: messagingSettings.first_three_free,
          ai_messaging: messagingSettings.ai_messaging,
          gift_messages: messagingSettings.gift_messages,
          gift_message_count: messagingSettings.gift_message_count,
          social_facebook: socialLinks.facebook,
          social_instagram: socialLinks.instagram,
          social_tiktok: socialLinks.tiktok,
          social_youtube: socialLinks.youtube,
          social_twitch: socialLinks.twitch,
          social_twitter: socialLinks.twitter,
          social_snapchat: socialLinks.snapchat,
          social_other_url: socialLinks.other_url,
        } as any);

      if (settingsError) throw settingsError;

      // Save subscription tier
      if (subscriptionTier.id) {
        const { error: tierError } = await supabase
          .from('subscription_tiers')
          .update({
            name: subscriptionTier.title,
            is_active: subscriptionTier.is_active,
            price: subscriptionTier.monthly_price,
            discount_comment: subscriptionTier.discount_comment,
            free_messages_per_month: subscriptionTier.free_messages_per_month,
            unlimited_messages: subscriptionTier.unlimited_messages,
            discount_percentage: subscriptionTier.discount_percentage,
          } as any)
          .eq('id', subscriptionTier.id);

        if (tierError) throw tierError;
      } else {
        const { error: tierError } = await supabase
          .from('subscription_tiers')
          .insert({
            creator_id: user.id,
            name: subscriptionTier.title,
            is_active: subscriptionTier.is_active,
            price: subscriptionTier.monthly_price,
            billing_interval: 'monthly',
            discount_comment: subscriptionTier.discount_comment,
            free_messages_per_month: subscriptionTier.free_messages_per_month,
            unlimited_messages: subscriptionTier.unlimited_messages,
            discount_percentage: subscriptionTier.discount_percentage,
          } as any);

        if (tierError) throw tierError;
      }

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
          <Button variant="ghost" size="sm" onClick={saveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4 space-y-6">
        {/* Messaging Section */}
        <Card>
          <CardHeader>
            <CardTitle>Messaging</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="pay-per-message">Pay per message</Label>
              <Switch
                id="pay-per-message"
                checked={messagingSettings.pay_per_message}
                onCheckedChange={(checked) =>
                  setMessagingSettings({ ...messagingSettings, pay_per_message: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price-per-message">Pricing per message</Label>
              <Input
                id="price-per-message"
                type="number"
                value={messagingSettings.price_per_message}
                onChange={(e) =>
                  setMessagingSettings({ ...messagingSettings, price_per_message: parseFloat(e.target.value) })
                }
                prefix="$"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-amount">Bulk message amount</Label>
              <Input
                id="bulk-amount"
                type="number"
                value={messagingSettings.bulk_message_amount}
                onChange={(e) =>
                  setMessagingSettings({ ...messagingSettings, bulk_message_amount: parseInt(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-price">Bulk message price</Label>
              <Input
                id="bulk-price"
                type="number"
                value={messagingSettings.bulk_message_price}
                onChange={(e) =>
                  setMessagingSettings({ ...messagingSettings, bulk_message_price: parseFloat(e.target.value) })
                }
                prefix="$"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="first-three-free">First 3 messages are always free</Label>
              <Switch
                id="first-three-free"
                checked={messagingSettings.first_three_free}
                onCheckedChange={(checked) =>
                  setMessagingSettings({ ...messagingSettings, first_three_free: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ai-messaging">Using AI for messaging</Label>
              <Switch
                id="ai-messaging"
                checked={messagingSettings.ai_messaging}
                onCheckedChange={(checked) =>
                  setMessagingSettings({ ...messagingSettings, ai_messaging: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="gift-messages">Gift messages for every unlock</Label>
              <Switch
                id="gift-messages"
                checked={messagingSettings.gift_messages}
                onCheckedChange={(checked) =>
                  setMessagingSettings({ ...messagingSettings, gift_messages: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gift-count">Number of messages</Label>
              <Input
                id="gift-count"
                type="number"
                value={messagingSettings.gift_message_count}
                onChange={(e) =>
                  setMessagingSettings({ ...messagingSettings, gift_message_count: parseInt(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Button variant="outline" className="w-full" onClick={() => navigate('/welcome-message/1')}>
                First welcome message
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/welcome-message/2')}>
                Second welcome message
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/welcome-message/3')}>
                Third welcome message
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Section */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sub-title">Subscription title</Label>
              <Input
                id="sub-title"
                value={subscriptionTier.title}
                onChange={(e) =>
                  setSubscriptionTier({ ...subscriptionTier, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount-comment">Discount comment</Label>
              <Input
                id="discount-comment"
                value={subscriptionTier.discount_comment}
                onChange={(e) =>
                  setSubscriptionTier({ ...subscriptionTier, discount_comment: e.target.value })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active-sub">Active subscription tier</Label>
              <Switch
                id="active-sub"
                checked={subscriptionTier.is_active}
                onCheckedChange={(checked) =>
                  setSubscriptionTier({ ...subscriptionTier, is_active: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="free-messages">Free messages per month</Label>
              <Input
                id="free-messages"
                type="number"
                value={subscriptionTier.free_messages_per_month}
                onChange={(e) =>
                  setSubscriptionTier({ ...subscriptionTier, free_messages_per_month: parseInt(e.target.value) })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="unlimited">Unlimited messages</Label>
              <Switch
                id="unlimited"
                checked={subscriptionTier.unlimited_messages}
                onCheckedChange={(checked) =>
                  setSubscriptionTier({ ...subscriptionTier, unlimited_messages: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-price">Monthly subscription price</Label>
              <Input
                id="monthly-price"
                type="number"
                value={subscriptionTier.monthly_price}
                onChange={(e) =>
                  setSubscriptionTier({ ...subscriptionTier, monthly_price: parseFloat(e.target.value) })
                }
                prefix="$"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount-percent">Discount percentage</Label>
              <Select
                value={subscriptionTier.discount_percentage.toString()}
                onValueChange={(value) =>
                  setSubscriptionTier({ ...subscriptionTier, discount_percentage: parseInt(value) })
                }
              >
                <SelectTrigger id="discount-percent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                  <SelectItem value="30">30%</SelectItem>
                  <SelectItem value="40">40%</SelectItem>
                  <SelectItem value="50">50%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="destructive" className="w-full">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete tier
            </Button>
          </CardContent>
        </Card>

        {/* Bundle Section */}
        <Card>
          <CardHeader>
            <CardTitle>Bundle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="active-bundle">Active bundle</Label>
              <Switch
                id="active-bundle"
                checked={bundleSettings.is_active}
                onCheckedChange={(checked) =>
                  setBundleSettings({ ...bundleSettings, is_active: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="original-price">Original price</Label>
              <Input
                id="original-price"
                type="number"
                value={bundleSettings.original_price}
                onChange={(e) =>
                  setBundleSettings({ ...bundleSettings, original_price: parseFloat(e.target.value) })
                }
                prefix="$"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discounted-price">Discounted price</Label>
              <Input
                id="discounted-price"
                type="number"
                value={bundleSettings.discounted_price}
                onChange={(e) =>
                  setBundleSettings({ ...bundleSettings, discounted_price: parseFloat(e.target.value) })
                }
                prefix="$"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="messages-included">Messages included</Label>
              <Input
                id="messages-included"
                type="number"
                value={bundleSettings.messages_included}
                onChange={(e) =>
                  setBundleSettings({ ...bundleSettings, messages_included: parseInt(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label>Media Files</Label>
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add from vault
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Socials Section */}
        <Card>
          <CardHeader>
            <CardTitle>Socials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                placeholder="facebook.com/username"
                value={socialLinks.facebook}
                onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                placeholder="instagram.com/username"
                value={socialLinks.instagram}
                onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok">Tiktok</Label>
              <Input
                id="tiktok"
                placeholder="tiktok.com/@username"
                value={socialLinks.tiktok}
                onChange={(e) => setSocialLinks({ ...socialLinks, tiktok: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube">Youtube</Label>
              <Input
                id="youtube"
                placeholder="youtube.com/@username"
                value={socialLinks.youtube}
                onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitch">Twitch</Label>
              <Input
                id="twitch"
                placeholder="twitch.tv/username"
                value={socialLinks.twitch}
                onChange={(e) => setSocialLinks({ ...socialLinks, twitch: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter (x.com)</Label>
              <Input
                id="twitter"
                placeholder="x.com/username"
                value={socialLinks.twitter}
                onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="snapchat">Snapchat</Label>
              <Input
                id="snapchat"
                placeholder="snapchat.com/add/username"
                value={socialLinks.snapchat}
                onChange={(e) => setSocialLinks({ ...socialLinks, snapchat: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="other-url">Other URL</Label>
              <Input
                id="other-url"
                placeholder="https://example.com"
                value={socialLinks.other_url}
                onChange={(e) => setSocialLinks({ ...socialLinks, other_url: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountSettings;
