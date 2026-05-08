import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Crown, Calendar, DollarSign, X, ChevronLeft, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  tier_id: string;
  tier_name: string;
  tier_price: number;
  billing_interval: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  creator_id: string;
  creator_name: string;
  creator_avatar: string | null;
  stripe_subscription_id: string | null;
}

const Subscriptions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
    }
  }, [user]);

  const fetchSubscriptions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('creator_subscriptions')
        .select(`
          id,
          status,
          current_period_start,
          current_period_end,
          tier_id,
          stripe_subscription_id,
          subscription_tiers (
            name,
            price,
            billing_interval,
            creator_id
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get creator details
      const creatorIds = data?.map(s => s.subscription_tiers?.creator_id).filter(Boolean) || [];
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', creatorIds);

      const creatorMap = new Map(creators?.map(c => [c.id, c]) || []);

      const formatted = data?.map(sub => {
        const tier = sub.subscription_tiers;
        const creator = creatorMap.get(tier?.creator_id);
        return {
          id: sub.id,
          tier_id: sub.tier_id,
          tier_name: tier?.name || 'Unknown',
          tier_price: tier?.price || 0,
          billing_interval: tier?.billing_interval || 'monthly',
          status: sub.status,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          creator_id: tier?.creator_id || '',
          creator_name: creator?.display_name || 'Unknown',
          creator_avatar: creator?.avatar_url || null,
          stripe_subscription_id: sub.stripe_subscription_id,
        };
      }) || [];

      setSubscriptions(formatted);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string, stripeSubId: string | null) => {
    if (!stripeSubId) {
      // Fallback for non-Stripe subscriptions
      setCancelling(subscriptionId);
      try {
        const { error } = await supabase
          .from('creator_subscriptions')
          .update({ status: 'canceled' })
          .eq('id', subscriptionId);

        if (error) throw error;

        toast.success('Subscription canceled successfully');
        fetchSubscriptions();
      } catch (error) {
        console.error('Error canceling subscription:', error);
        toast.error('Failed to cancel subscription');
      } finally {
        setCancelling(null);
      }
      return;
    }

    // Cancel via Stripe
    setCancelling(subscriptionId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { subscriptionId: stripeSubId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      toast.success(`Subscription will be canceled. Access until ${new Date(data.current_period_end).toLocaleDateString()}`);
      fetchSubscriptions();
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      toast.error(error.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(null);
    }
  };

  const handleManageAll = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('subscription-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to open billing portal');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-primary';
      case 'canceled':
        return 'bg-destructive';
      case 'past_due':
        return 'bg-muted-foreground';
      default:
        return 'bg-muted-foreground';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Subscriptions</h1>
          <div className="w-10" />
        </div>
      </header>
      
      <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6 p-6 rounded-xl bg-primary/5 border border-primary/20">
        <h1 className="text-3xl font-bold mb-2">My Subscriptions</h1>
        <p className="text-muted-foreground">Manage your creator subscriptions</p>
      </div>

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={Crown}
          title="No Active Subscriptions"
          description="You don't have any active subscriptions yet. Browse creators to find exclusive content!"
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleManageAll}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage All in Stripe
            </Button>
          </div>
          {subscriptions.map((sub) => (
            <Card key={sub.id} className="">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={sub.creator_avatar || ''} />
                      <AvatarFallback>{sub.creator_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{sub.creator_name}</CardTitle>
                      <CardDescription>{sub.tier_name}</CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(sub.status)}>
                    {sub.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      ${sub.tier_price} / {sub.billing_interval}
                    </span>
                  </div>
                  {sub.current_period_start && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Started {format(new Date(sub.current_period_start), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  {sub.current_period_end && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Renews {format(new Date(sub.current_period_end), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>

                {sub.status === 'active' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <X className="h-4 w-4 mr-2" />
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel your subscription to {sub.creator_name}? 
                          You'll lose access at the end of your current billing period.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleCancelSubscription(sub.id, sub.stripe_subscription_id)}
                          disabled={cancelling === sub.id}
                        >
                          {cancelling === sub.id ? 'Canceling...' : 'Cancel Subscription'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default Subscriptions;
