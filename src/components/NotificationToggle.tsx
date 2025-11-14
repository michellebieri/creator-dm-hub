import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Bell, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const NotificationToggle = () => {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load notification preferences from user metadata
    if (user?.user_metadata?.email_notifications !== undefined) {
      setEmailNotifications(user.user_metadata.email_notifications);
    }
  }, [user]);

  const handleToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { email_notifications: enabled }
      });

      if (error) throw error;

      setEmailNotifications(enabled);
      toast.success(enabled ? 'Email notifications enabled' : 'Email notifications disabled');
    } catch (error: any) {
      console.error('Error updating notifications:', error);
      toast.error('Failed to update notification settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Notification Settings</h3>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="email-notifications" className="text-base font-medium cursor-pointer">
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive emails when you get new messages
              </p>
            </div>
          </div>
          <Switch
            id="email-notifications"
            checked={emailNotifications}
            onCheckedChange={handleToggle}
            disabled={loading}
          />
        </div>
      </div>
    </Card>
  );
};
