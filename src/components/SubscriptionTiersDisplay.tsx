import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { AddFundsDialog } from '@/components/AddFundsDialog';

interface SubscriptionTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_interval: string;
  features: string[] | null;
  is_active: boolean;
}

interface SubscriptionTiersDisplayProps {
  creatorId: string;
  creatorName: string;
}

export const SubscriptionTiersDisplay = ({ creatorId, creatorName }: SubscriptionTiersDisplayProps) => {
  const { user } = useAuth();
  const { balance, spend } = useWallet();
  const { toast } = useToast();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [showAddFunds, setShowAddFunds] = useState(false);

  useEffect(() => {
    fetchTiers();
    if (user) {
      checkSubscription();
    }
  }, [creatorId, user]);

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
        features: Array.isArray(tier.features) ? tier.features.map(f => String(f)) : [],
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
        .eq('status', 'active')
        .maybeSingle();

      if (data && data.subscription_tiers) {
        const tier = data.subscription_tiers as any;
        if (tier.creator_id === creatorId) {
          setIsSubscribed(true);
          setCurrentSubscription(data);
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

    if (balance < tier.price) {
      setSelectedTier(tier);
      setShowAddFunds(true);
      return;
    }

    setSelectedTier(tier);
    setSubscribing(true);

    try {
      // Process payment
      const success = await spend(tier.price, 'subscription', `Subscribed to ${creatorName}: ${tier.name}`, creatorId);
      if (!success) {
        toast({ title: "Payment failed", description: "Could not process subscription payment", variant: "destructive" });
        return;
      }

      // Calculate subscription period
      const now = new Date();
      const periodEnd = new Date(now);
      if (tier.billing_interval === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Create subscription record
      const { error } = await supabase
        .from('creator_subscriptions')
        .insert({
          customer_id: user.id,
          tier_id: tier.id,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        });

      if (error) throw error;

      toast({ title: "Subscribed!", description: `You are now subscribed to ${creatorName}'s ${tier.name} tier` });
      setIsSubscribed(true);
      setDialogOpen(false);
      checkSubscription();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to subscribe", variant: "destructive" });
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return;

    try {
      const { error } = await supabase
        .from('creator_subscriptions')
        .update({ status: 'canceled' })
        .eq('id', currentSubscription.id);

      if (error) throw error;

      toast({ title: "Subscription canceled", description: "Your subscription has been canceled" });
      setIsSubscribed(false);
      setCurrentSubscription(null);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to cancel subscription", variant: "destructive" });
    }
  };

  if (loading) return null;
  if (tiers.length === 0) return null;

  return (
    <>
      <div className="mt-4">
        {isSubscribed ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <Crown className="h-3 w-3 mr-1" />
              Subscribed
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
                        Renews: {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">Active</Badge>
                </div>
              </Card>
              <Button variant="destructive" onClick={handleCancelSubscription} className="w-full">
                Cancel Subscription
              </Button>
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
                    {tier.features && tier.features.length > 0 && (
                      <ul className="space-y-1">
                        {tier.features.map((feature, i) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
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

      <AddFundsDialog
        open={showAddFunds}
        onOpenChange={setShowAddFunds}
        requiredAmount={selectedTier?.price}
        currentBalance={balance}
        onSuccess={() => {
          setShowAddFunds(false);
          if (selectedTier) {
            handleSubscribe(selectedTier);
          }
        }}
      />
    </>
  );
};
