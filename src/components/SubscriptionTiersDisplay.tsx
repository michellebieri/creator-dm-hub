import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Loader2, MessageCircle, Lock, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';

interface SubscriptionTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_interval: string;
  free_messages_per_month: number | null;
  unlimited_messages: boolean | null;
  is_active: boolean;
}

interface SubscriptionTiersDisplayProps {
  creatorId: string;
  creatorName: string;
}

export const SubscriptionTiersDisplay = ({ creatorId, creatorName }: SubscriptionTiersDisplayProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchTiers();
    if (user) {
      checkSubscription();
    }
  }, [creatorId, user]);

  // Handle subscription success from URL params
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription');
    const tierId = searchParams.get('tier');
    
    if (subscriptionStatus === 'success' && tierId && user) {
      verifyAndCreateSubscription(tierId);
    }
  }, [searchParams, user]);

  const verifyAndCreateSubscription = async (tierId: string) => {
    setVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('verify-subscription', {
        body: { tierId, creatorId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data?.subscribed) {
        toast({
          title: "Subscription Active!",
          description: `You are now subscribed to ${creatorName}`,
        });
        setIsSubscribed(true);
        checkSubscription();
      }
    } catch (error: any) {
      console.error('Error verifying subscription:', error);
    } finally {
      setVerifying(false);
      // Clean up URL params
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const fetchTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setTiers((data || []).map(tier => ({
        ...tier,
        unlimited_messages: tier.unlimited_messages || false,
        free_messages_per_month: tier.free_messages_per_month || null,
      })));
    } catch (error) {
      console.error('Error fetching tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('creator_subscriptions')
        .select('*, subscription_tiers(*)')
        .eq('customer_id', user.id)
        .in('status', ['active', 'canceling'])
        .maybeSingle();

      if (data && data.subscription_tiers) {
        const tier = data.subscription_tiers as any;
        if (tier.creator_id === creatorId) {
          const periodEnd = new Date(data.current_period_end);
          if (periodEnd > new Date()) {
            setIsSubscribed(true);
            setCurrentSubscription(data);
          }
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to subscribe", variant: "destructive" });
      return;
    }

    setSelectedTier(tier);
    setSubscribing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { tierId: tier.id, creatorId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe Checkout in new tab
        window.open(data.url, '_blank');
        toast({
          title: "Checkout opened",
          description: "Complete your subscription in the new tab",
        });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to start checkout", variant: "destructive" });
    } finally {
      setSubscribing(false);
    }
  };

  const handleManageSubscription = async () => {
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
      toast({ title: "Error", description: error.message || "Failed to open portal", variant: "destructive" });
    }
  };

  const getBenefitsList = (tier: SubscriptionTier) => {
    const benefits = [];
    if (tier.unlimited_messages) {
      benefits.push({ icon: MessageCircle, text: 'Unlimited free messages' });
    } else if (tier.free_messages_per_month && tier.free_messages_per_month > 0) {
      benefits.push({ icon: MessageCircle, text: `${tier.free_messages_per_month} free messages per month` });
    }
    benefits.push({ icon: Lock, text: 'Access to exclusive content' });
    return benefits;
  };

  if (loading || verifying) return null;
  if (tiers.length === 0) return null;

  return (
    <>
      <div className="mt-4">
        {isSubscribed ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <Crown className="h-3 w-3 mr-1" />
              {currentSubscription?.status === 'canceling' ? 'Subscribed (Canceling)' : 'Subscribed'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(true)}>
              Manage
            </Button>
          </div>
        ) : (
          <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
            <Crown className="h-4 w-4 mr-2" />
            Subscribe
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isSubscribed ? 'Your Subscription' : `Subscribe to ${creatorName}`}
            </DialogTitle>
          </DialogHeader>

          {isSubscribed && currentSubscription ? (
            <div className="space-y-4">
              <Card className="p-4 border-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{currentSubscription.subscription_tiers?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      ${currentSubscription.subscription_tiers?.price}/{currentSubscription.subscription_tiers?.billing_interval}
                    </p>
                    {currentSubscription.current_period_end && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {currentSubscription.status === 'canceling' ? 'Access until: ' : 'Renews: '}
                        {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className={currentSubscription.status === 'canceling' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-green-500/10 text-green-600'}>
                    {currentSubscription.status === 'canceling' ? 'Canceling' : 'Active'}
                  </Badge>
                </div>
              </Card>
              <Button variant="outline" onClick={handleManageSubscription} className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Manage billing, update payment method, or cancel subscription
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {tiers.map((tier) => (
                <Card key={tier.id} className="p-4 hover:border-primary transition-colors">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">{tier.name}</h3>
                      <p className="text-2xl font-bold">
                        ${tier.price}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{tier.billing_interval}
                        </span>
                      </p>
                    </div>
                    {tier.description && (
                      <p className="text-sm text-muted-foreground">{tier.description}</p>
                    )}
                    <ul className="space-y-2">
                      {getBenefitsList(tier).map((benefit, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          {benefit.text}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      onClick={() => handleSubscribe(tier)} 
                      disabled={subscribing}
                      className="w-full"
                    >
                      {subscribing && selectedTier?.id === tier.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Subscribe
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
