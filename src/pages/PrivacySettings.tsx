import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Shield, Eye, MessageCircle, UserCheck, Download } from 'lucide-react';
import { toast } from 'sonner';

interface PrivacySettings {
  profile_visible: boolean;
  allow_messages_from_non_followers: boolean;
  show_online_status: boolean;
  show_read_receipts: boolean;
  allow_content_downloads: boolean;
}

const PrivacySettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>({
    profile_visible: true,
    allow_messages_from_non_followers: true,
    show_online_status: true,
    show_read_receipts: true,
    allow_content_downloads: false,
  });

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    // In a real app, load from a privacy_settings table
    // For now, using default values
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real app, save to database
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Privacy settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof PrivacySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Privacy Settings</h1>
        <p className="text-muted-foreground">Control who can see and interact with your content</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              <CardTitle>Profile Visibility</CardTitle>
            </div>
            <CardDescription>Control who can see your profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="profile-visible">Public Profile</Label>
                <p className="text-sm text-muted-foreground">
                  Allow anyone to view your profile
                </p>
              </div>
              <Switch
                id="profile-visible"
                checked={settings.profile_visible}
                onCheckedChange={(checked) => updateSetting('profile_visible', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <CardTitle>Messaging</CardTitle>
            </div>
            <CardDescription>Control who can message you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allow-messages">Allow Messages from Anyone</Label>
                <p className="text-sm text-muted-foreground">
                  Let non-followers send you messages
                </p>
              </div>
              <Switch
                id="allow-messages"
                checked={settings.allow_messages_from_non_followers}
                onCheckedChange={(checked) => updateSetting('allow_messages_from_non_followers', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              <CardTitle>Activity Status</CardTitle>
            </div>
            <CardDescription>Control visibility of your activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="online-status">Show Online Status</Label>
                <p className="text-sm text-muted-foreground">
                  Let others see when you're online
                </p>
              </div>
              <Switch
                id="online-status"
                checked={settings.show_online_status}
                onCheckedChange={(checked) => updateSetting('show_online_status', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="read-receipts">Show Read Receipts</Label>
                <p className="text-sm text-muted-foreground">
                  Let others see when you've read their messages
                </p>
              </div>
              <Switch
                id="read-receipts"
                checked={settings.show_read_receipts}
                onCheckedChange={(checked) => updateSetting('show_read_receipts', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              <CardTitle>Content Protection</CardTitle>
            </div>
            <CardDescription>Control how your content can be used</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allow-downloads">Allow Content Downloads</Label>
                <p className="text-sm text-muted-foreground">
                  Let customers download purchased content
                </p>
              </div>
              <Switch
                id="allow-downloads"
                checked={settings.allow_content_downloads}
                onCheckedChange={(checked) => updateSetting('allow_content_downloads', checked)}
                disabled
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Note: Downloads are currently disabled for all content to protect creators
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;
