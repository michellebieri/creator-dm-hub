import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Loader2, MessageCircle, Lock, Settings, Wallet, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/hooks/useWallet'; // balance display only — purchases go through purchase_subscription RPC

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
  const navigate = useNavigate();
  const { balance } = useWallet();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [confirmStep, setConfirmStep] = useState(false);
  
  const isCreator = user?.id === creatorId;

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
        .eq('creator_id', creatorId)
        .in('status', ['active', 'canceling'])
        .maybeSingle();

      if (data && data.subscription_tiers) {
        const periodEnd = new Date(data.current_period_end);
        if (periodEnd > new Date()) {
          setIsSubscribed(true);
          setCurrentSubscription(data);
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleSelectTier = (tier: SubscriptionTier) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to subscribe", variant: "destructive" });
      return;
    }
    setSelectedTier(tier);
    setConfirmStep(true);
  };

  const handleConfirmSubscription = async () => {
    if (!user || !selectedTier) return;

    // Check wallet balance
    if (balance < selectedTier.price) {
      toast({ 
        title: "Insufficient balance", 
        description: `You need $${selectedTier.price.toFixed(2)} in your wallet. Current balance: $${balance.toFixed(2)}`,
        variant: "destructive" 
      });
      return;
    }

    setSubscribing(true);

    try {
      // Use the purchase_subscription RPC — it atomically:
      // 1. Locks the wallet row and deducts balance
      // 2. Creates creator_subscriptions with creator_id
      // 3. Creates subscription_message_usage if applicable
      // 4. Records a transactions row (creator earnings) + platform_fees
      // Doing this client-side piece by piece risks creator revenue never being recorded.
      const { data: rpcResult, error: rpcError } = await supabase.rpc('purchase_subscription', {
        p_tier_id: selectedTier.id,
        p_creator_id: creatorId,
      });

      if (rpcError) throw rpcError;

      const result = rpcResult as { success: boolean; error?: string; subscription_id?: string; period_end?: string };

      if (!result.success) {
        throw new Error(result.error || 'Failed to activate subscription');
      }

      const periodEnd = result.period_end ? new Date(result.period_end) : new Date();

      // Notify creator (fire-and-forget)
      supabase.functions.invoke('create-notification', {
        body: {
          userId: creatorId,
          type: 'new_subscriber',
          title: 'New Subscriber!',
          message: `Someone subscribed to your ${selectedTier.name} tier for $${selectedTier.price.toFixed(2)}`,
          link: '/subscribers',
        },
      }).catch(err => console.log('Notification error:', err));

      // Update UI
      setIsSubscribed(true);
      setCurrentSubscription({ id: result.subscription_id, subscription_tiers: selectedTier, current_period_end: result.period_end });
      setConfirmStep(false);
      setDialogOpen(false);

      toast({
        title: "Subscription Active!",
        description: `You are now subscribed to ${creatorName}. Your subscription renews on ${periodEnd.toLocaleDateString()}.`,
      });

    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to activate subscription", 
        variant: "destructive" 
      });
    } finally {
      setSubscribing(false);
    }
  };

  const [cancelling, setCancelling] = useState(false);

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return;
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('creator_subscriptions')
        .update({ status: 'canceling' })
        .eq('id', currentSubscription.id);

      if (error) throw error;

      setCurrentSubscription({ ...currentSubscription, status: 'canceling' });
      setDialogOpen(false);
      toast({
        title: "Subscription cancelled",
        description: `You'll keep access until ${new Date(currentSubscription.current_period_end).toLocaleDateString()}. No further charges.`,
      });
    } catch (error: any) {
      toast({ title: "Cancel failed", description: error.message, variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  const handleBackToTiers = () => {
    setConfirmStep(false);
    setSelectedTier(null);
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

  if (loading) {
    return (
      <Button size="lg" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  // Creator sees their own profile - show manage button
  if (isCreator) {
    return (
      <Button 
        onClick={() => navigate('/settings/subscription')} 
        size="lg"
        variant="outline"
      >
        <Settings className="h-4 w-4 mr-2" />
        Subscription tiers
      </Button>
    );
  }

  // No tiers available - don't show button for visitors
  if (tiers.length === 0) return null;

  return (
    <>
      {isSubscribed ? (
        <Button 
          onClick={() => setDialogOpen(true)} 
          size="lg"
          variant="secondary"
          className="bg-muted text-muted-foreground"
        >
          <Crown className="h-4 w-4 mr-2" />
          Subscribed
          <Check className="h-4 w-4 ml-1" />
        </Button>
      ) : (
        <Button onClick={() => setDialogOpen(true)} size="lg">
          <Crown className="h-4 w-4 mr-2" />
          Subscribe
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setConfirmStep(false);
          setSelectedTier(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isSubscribed ? 'Your Subscription' : confirmStep ? 'Confirm Subscription' : `Subscribe to ${creatorName}`}
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
                  <Badge variant="secondary" className={currentSubscription.status === 'canceling' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}>
                    {currentSubscription.status === 'canceling' ? 'Canceling' : 'Active'}
                  </Badge>
                </div>
              </Card>
              {currentSubscription.status !== 'canceling' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/5">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Cancel Subscription
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You'll keep access until <strong>{new Date(currentSubscription.current_period_end).toLocaleDateString()}</strong>. After that, your subscription won't renew and you'll lose access to subscriber benefits.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Yes, cancel
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <p className="text-xs text-center text-muted-foreground">
                Subscription auto-renews from your wallet balance
              </p>
            </div>
          ) : confirmStep && selectedTier ? (
            // Confirmation step - like content purchase confirmation
            <div className="space-y-6">
              <Card className="p-4 border-primary">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{selectedTier.name}</h3>
                    <Badge className="bg-primary/10 text-primary">
                      ${selectedTier.price}/{selectedTier.billing_interval}
                    </Badge>
                  </div>
                  
                  <ul className="space-y-2">
                    {getBenefitsList(selectedTier).map((benefit, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        {benefit.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Your wallet balance:</span>
                  <span className={balance >= selectedTier.price ? 'text-primary font-medium' : 'text-destructive font-medium'}>
                    ${balance.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between font-medium">
                  <span>Subscription cost:</span>
                  <span>${selectedTier.price.toFixed(2)}</span>
                </div>
                {balance < selectedTier.price && (
                  <p className="text-xs text-destructive mt-2">
                    Insufficient balance. Please add funds to your wallet.
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBackToTiers} className="flex-1">
                  Back
                </Button>
                {balance < selectedTier.price ? (
                  <Button onClick={() => navigate('/wallet')} className="flex-1">
                    <Wallet className="h-4 w-4 mr-2" />
                    Add Funds
                  </Button>
                ) : (
                  <Button 
                    onClick={handleConfirmSubscription} 
                    disabled={subscribing}
                    className="flex-1"
                  >
                    {subscribing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Confirm Subscription
                  </Button>
                )}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By confirming, ${selectedTier.price.toFixed(2)} will be deducted from your wallet.
                Your subscription will auto-renew {selectedTier.billing_interval}.
              </p>
            </div>
          ) : (
            // Tier selection
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
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          {benefit.text}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      onClick={() => handleSelectTier(tier)} 
                      className="w-full"
                    >
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
