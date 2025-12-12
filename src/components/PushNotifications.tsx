import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Bell, BellOff, Smartphone } from 'lucide-react';

export default function PushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    checkSupport();
    checkSubscription();
  }, []);

  const checkSupport = () => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  };

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeUser = async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported on this device');
      return;
    }

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        toast.error('Notification permission denied');
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.warn('VITE_VAPID_PUBLIC_KEY is not configured. Push notifications require a VAPID key pair.');
        toast.error('Push notifications are not configured. Please contact support.');
        return;
      }
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Save subscription to database
      if (user) {
        const subscriptionData = subscription.toJSON() as any;
        
        // Check if subscription exists
        const { data: existing } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('push_subscriptions')
            .update({
              subscription: subscriptionData,
              endpoint: subscription.endpoint,
            })
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('push_subscriptions')
            .insert([{
              user_id: user.id,
              subscription: subscriptionData,
              endpoint: subscription.endpoint,
            }]);

          if (error) throw error;
        }
      }

      setIsSubscribed(true);
      toast.success('Push notifications enabled');
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('Failed to enable push notifications');
    }
  };

  const unsubscribeUser = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove subscription from database
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id);
        }

        setIsSubscribed(false);
        toast.success('Push notifications disabled');
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast.error('Failed to disable push notifications');
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      await subscribeUser();
    } else {
      await unsubscribeUser();
    }
  };

  if (!isSupported) {
    return (
      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertDescription>
          Push notifications are not supported on this device or browser.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <Bell className="h-6 w-6 text-primary" />
            ) : (
              <BellOff className="h-6 w-6 text-muted-foreground" />
            )}
            <div>
              <CardTitle>Push Notifications</CardTitle>
              <CardDescription>
                Receive real-time notifications on this device
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission === 'denied' && (
          <Alert variant="destructive">
            <AlertDescription>
              Notification permission is blocked. Please enable it in your browser settings.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications">Enable Push Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Get notified about new messages and updates
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={permission === 'denied'}
          />
        </div>

        {isSubscribed && (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              You will receive notifications for:
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• New messages</li>
              <li>• Content unlocks</li>
              <li>• Payment confirmations</li>
              <li>• Important updates</li>
            </ul>
          </div>
        )}

        <Button
          onClick={() => {
            if (isSubscribed) {
              new Notification('Test Notification', {
                body: 'Push notifications are working!',
                icon: '/favicon.ico',
              });
            } else {
              toast.error('Please enable push notifications first');
            }
          }}
          variant="outline"
          className="w-full"
          disabled={!isSubscribed}
        >
          Send Test Notification
        </Button>
      </CardContent>
    </Card>
  );
}
