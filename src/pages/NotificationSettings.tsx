import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail, MessageCircle, DollarSign, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import PushNotifications from '@/components/PushNotifications';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface NotificationPreferences {
  email_new_message: boolean;
  email_new_purchase: boolean;
  email_payout_completed: boolean;
  email_unlockable_purchased: boolean;
  push_new_message: boolean;
  push_new_purchase: boolean;
  push_payout_completed: boolean;
  in_app_all: boolean;
}

const NotificationSettings = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_new_message: true,
    email_new_purchase: true,
    email_payout_completed: true,
    email_unlockable_purchased: true,
    push_new_message: true,
    push_new_purchase: true,
    push_payout_completed: true,
    in_app_all: true,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real implementation, save to database
      // For now, just store in localStorage
      localStorage.setItem('notification_preferences', JSON.stringify(preferences));

      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated",
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    // Load saved preferences
    const saved = localStorage.getItem('notification_preferences');
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Notification Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which emails you'd like to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_new_message">New Messages</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when you receive a new message
              </p>
            </div>
            <Switch
              id="email_new_message"
              checked={preferences.email_new_message}
              onCheckedChange={() => handleToggle('email_new_message')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_new_purchase">New Purchases</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when someone purchases credits or content
              </p>
            </div>
            <Switch
              id="email_new_purchase"
              checked={preferences.email_new_purchase}
              onCheckedChange={() => handleToggle('email_new_purchase')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_unlockable_purchased">Unlockable Content Purchased</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when your content is unlocked
              </p>
            </div>
            <Switch
              id="email_unlockable_purchased"
              checked={preferences.email_unlockable_purchased}
              onCheckedChange={() => handleToggle('email_unlockable_purchased')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_payout_completed">Payout Completed</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when your payout is processed
              </p>
            </div>
            <Switch
              id="email_payout_completed"
              checked={preferences.email_payout_completed}
              onCheckedChange={() => handleToggle('email_payout_completed')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Manage browser push notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push_new_message">New Messages</Label>
              <p className="text-sm text-muted-foreground">
                Instant notifications for new messages
              </p>
            </div>
            <Switch
              id="push_new_message"
              checked={preferences.push_new_message}
              onCheckedChange={() => handleToggle('push_new_message')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push_new_purchase">New Purchases</Label>
              <p className="text-sm text-muted-foreground">
                Instant notifications for purchases
              </p>
            </div>
            <Switch
              id="push_new_purchase"
              checked={preferences.push_new_purchase}
              onCheckedChange={() => handleToggle('push_new_purchase')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push_payout_completed">Payout Completed</Label>
              <p className="text-sm text-muted-foreground">
                Instant notifications for completed payouts
              </p>
            </div>
            <Switch
              id="push_payout_completed"
              checked={preferences.push_payout_completed}
              onCheckedChange={() => handleToggle('push_payout_completed')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            In-App Notifications
          </CardTitle>
          <CardDescription>
            Control notifications within the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="in_app_all">All In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications in the app notification center
              </p>
            </div>
            <Switch
              id="in_app_all"
              checked={preferences.in_app_all}
              onCheckedChange={() => handleToggle('in_app_all')}
            />
          </div>
        </CardContent>
      </Card>

      <PushNotifications />

      <Card>
        <CardHeader>
          <CardTitle>Language Preferences</CardTitle>
          <CardDescription>
            Choose your preferred language for the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;
