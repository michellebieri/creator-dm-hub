import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Mail, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

interface EmailPrefs {
  new_message: boolean;
  new_subscriber: boolean;
  new_purchase: boolean;
  new_tip: boolean;
  new_comment: boolean;
  new_follower: boolean;
  promotional: boolean;
  weekly_summary: boolean;
}

const EmailPreferences = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<EmailPrefs>({
    new_message: true,
    new_subscriber: true,
    new_purchase: true,
    new_tip: true,
    new_comment: true,
    new_follower: true,
    promotional: false,
    weekly_summary: true,
  });

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          new_message: data.new_message,
          new_subscriber: data.new_subscriber,
          new_purchase: data.new_purchase,
          new_tip: data.new_tip,
          new_comment: data.new_comment,
          new_follower: data.new_follower,
          promotional: data.promotional,
          weekly_summary: data.weekly_summary,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load email preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof EmailPrefs, value: boolean) => {
    if (!user) return;

    setPreferences(prev => ({ ...prev, [key]: value }));

    try {
      const { error } = await supabase
        .from('email_preferences')
        .upsert({
          user_id: user.id,
          [key]: value,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      toast.success('Email preference updated');
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Failed to update preference');
      // Revert on error
      setPreferences(prev => ({ ...prev, [key]: !value }));
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const isCreator = user?.user_metadata?.role === 'creator';

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Email Preferences</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="container mx-auto p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Mail className="h-8 w-8" />
            Email Preferences
          </h1>
          <p className="text-muted-foreground">
            Manage which email notifications you want to receive
          </p>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Choose what you want to be notified about via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Activity Notifications</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="new_message" className="flex flex-col gap-1 cursor-pointer">
                <span>New Messages</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Receive emails when you get new messages
                </span>
              </Label>
              <Switch
                id="new_message"
                checked={preferences.new_message}
                onCheckedChange={(checked) => updatePreference('new_message', checked)}
              />
            </div>

            {isCreator && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="new_subscriber" className="flex flex-col gap-1 cursor-pointer">
                    <span>New Subscribers</span>
                    <span className="text-sm text-muted-foreground font-normal">
                      Notify when someone subscribes to you
                    </span>
                  </Label>
                  <Switch
                    id="new_subscriber"
                    checked={preferences.new_subscriber}
                    onCheckedChange={(checked) => updatePreference('new_subscriber', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="new_purchase" className="flex flex-col gap-1 cursor-pointer">
                    <span>New Purchases</span>
                    <span className="text-sm text-muted-foreground font-normal">
                      Notify when someone purchases your content
                    </span>
                  </Label>
                  <Switch
                    id="new_purchase"
                    checked={preferences.new_purchase}
                    onCheckedChange={(checked) => updatePreference('new_purchase', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="new_tip" className="flex flex-col gap-1 cursor-pointer">
                    <span>Tips Received</span>
                    <span className="text-sm text-muted-foreground font-normal">
                      Notify when you receive tips
                    </span>
                  </Label>
                  <Switch
                    id="new_tip"
                    checked={preferences.new_tip}
                    onCheckedChange={(checked) => updatePreference('new_tip', checked)}
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="new_comment" className="flex flex-col gap-1 cursor-pointer">
                <span>New Comments</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Notify when someone comments on your content
                </span>
              </Label>
              <Switch
                id="new_comment"
                checked={preferences.new_comment}
                onCheckedChange={(checked) => updatePreference('new_comment', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="new_follower" className="flex flex-col gap-1 cursor-pointer">
                <span>New Followers</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Notify when someone follows you
                </span>
              </Label>
              <Switch
                id="new_follower"
                checked={preferences.new_follower}
                onCheckedChange={(checked) => updatePreference('new_follower', checked)}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold">Summary & Marketing</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="weekly_summary" className="flex flex-col gap-1 cursor-pointer">
                <span>Weekly Summary</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Receive a weekly summary of your activity
                </span>
              </Label>
              <Switch
                id="weekly_summary"
                checked={preferences.weekly_summary}
                onCheckedChange={(checked) => updatePreference('weekly_summary', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="promotional" className="flex flex-col gap-1 cursor-pointer">
                <span>Promotional Emails</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Receive updates about new features and offers
                </span>
              </Label>
              <Switch
                id="promotional"
                checked={preferences.promotional}
                onCheckedChange={(checked) => updatePreference('promotional', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default EmailPreferences;
