import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Crown, MessageCircle, Check, Wallet, Loader2, ShoppingCart, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useCredits } from '@/hooks/useCredits';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface SubscriptionTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_interval: string;
  free_messages_per_month: number | null;
  unlimited_messages: boolean | null;
}

interface MessagePack {
  id: string;
  quantity: number;
  price: number;
  discount_percentage: number;
}

interface PaymentRequiredOverlayProps {
  creatorId: string;
  creatorProfile: {
    display_name: string;
    avatar_url: string | null;
    username: string;
  } | null;
  pricePerMessage: number;
  packs: MessagePack[];
  onSubscribed?: () => void;
}

export const PaymentRequiredOverlay = ({ 
  creatorId, 
  creatorProfile, 
  pricePerMessage,
  packs,
  onSubscribed 
}: PaymentRequiredOverlayProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isSubscribed, loading: subLoading } = useSubscription(user?.id, creatorId);
  const { credits, loading: creditsLoading } = useCredits(creatorId);
  const { balance, spend } = useWallet();
  
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'subscribe' | 'credits'>('subscribe');

  useEffect(() => {
    fetchTiers();
  }, [creatorId]);

  const fetchTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error('Error fetching tiers:', error);
    } finally {
      setLoadingTiers(false);
    }
  };

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to subscribe", variant: "destructive" });
      return;
    }

    if (balance < tier.price) {
      toast({ 
        title: "Insufficient balance", 
        description: `You need $${tier.price.toFixed(2)} in your wallet.`,
        variant: "destructive" 
      });
      navigate('/wallet');
      return;
    }

    setSubscribing(true);
    try {
      const spendSuccess = await spend(
        tier.price, 
        'subscription', 
        `Subscription to ${creatorProfile?.display_name} - ${tier.name}`,
        creatorId
      );

      if (!spendSuccess) {
        throw new Error('Failed to process payment from wallet');
      }

      const now = new Date();
      const periodEnd = new Date(now);
      if (tier.billing_interval === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else if (tier.billing_interval === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const { data: subscription, error: subError } = await supabase
        .from('creator_subscriptions')
        .insert({
          customer_id: user.id,
          tier_id: tier.id,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .select()
        .single();

      if (subError) throw subError;

      if (tier.free_messages_per_month && tier.free_messages_per_month > 0) {
        await supabase
          .from('subscription_message_usage')
          .insert({
            subscription_id: subscription.id,
            customer_id: user.id,
            creator_id: creatorId,
            messages_allowed: tier.free_messages_per_month,
            messages_used: 0,
            period_start: now.toISOString(),
            period_end: periodEnd.toISOString(),
          });
      }

      // Record in transactions table so creator revenue stats reflect this subscription
      await supabase.rpc('insert_completed_transaction', {
        p_creator_id: creatorId,
        p_amount: tier.price,
        p_transaction_type: 'pack',
      });

      toast({
        title: "Subscribed!",
        description: `You are now subscribed to ${creatorProfile?.display_name}`,
      });

      onSubscribed?.();
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

  const handlePurchasePack = async (packId: string) => {
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { packId, creatorId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Opening checkout",
          description: "Complete your purchase in the new tab",
        });
      }
    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  // Show when the user is not subscribed and has no credits (even if they have wallet balance)
  const loading = subLoading || creditsLoading || loadingTiers;
  const shouldShow = !isSubscribed && credits <= 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!shouldShow) {
    return null;
  }

  const hasTiers = tiers.length > 0;
  const hasPacks = packs && packs.length > 0;

  return (
    <div className="bg-card border rounded-lg p-6 space-y-6">
      {/* Header with creator info */}
      <div className="text-center space-y-4">
        {creatorProfile && (
          <Avatar className="h-20 w-20 mx-auto">
            {creatorProfile.avatar_url && (
              <img src={creatorProfile.avatar_url} alt={creatorProfile.display_name} className="h-full w-full object-cover" />
            )}
            <AvatarFallback className="text-2xl">{creatorProfile.display_name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        )}
        <div>
          <h2 className="text-xl font-semibold">Message {creatorProfile?.display_name}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Choose a payment option to start chatting
          </p>
        </div>
      </div>

      {/* Balance info */}
      <div className="flex items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wallet className="h-4 w-4" />
          <span>Balance: ${balance.toFixed(2)}</span>
        </div>
        {pricePerMessage > 0 && (
          <Badge variant="outline">
            ${pricePerMessage.toFixed(2)}/message
          </Badge>
        )}
      </div>

      {/* Tabs */}
      {hasTiers && hasPacks && (
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={selectedTab === 'subscribe' ? 'default' : 'ghost'}
            className="flex-1"
            onClick={() => setSelectedTab('subscribe')}
          >
            <Crown className="h-4 w-4 mr-2" />
            Subscribe
          </Button>
          <Button
            variant={selectedTab === 'credits' ? 'default' : 'ghost'}
            className="flex-1"
            onClick={() => setSelectedTab('credits')}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Buy Credits
          </Button>
        </div>
      )}

      {/* Subscription Tiers */}
      {(selectedTab === 'subscribe' || !hasPacks) && hasTiers && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Subscription Plans</h3>
          </div>
          <div className="grid gap-3">
            {tiers.map((tier) => (
              <Card key={tier.id} className="p-4 hover:border-primary transition-colors">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{tier.name}</h4>
                      {tier.unlimited_messages && (
                        <Badge variant="secondary" className="text-xs">Unlimited</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        ${tier.price}/{tier.billing_interval}
                      </span>
                      {tier.free_messages_per_month && !tier.unlimited_messages && (
                        <span>{tier.free_messages_per_month} messages/month</span>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleSubscribe(tier)}
                    disabled={subscribing}
                    size="sm"
                  >
                    {subscribing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : balance >= tier.price ? (
                      'Subscribe'
                    ) : (
                      <>Add Funds</>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Message Packs */}
      {(selectedTab === 'credits' || !hasTiers) && hasPacks && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Message Credits</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {packs.map((pack) => (
              <Card key={pack.id} className="p-4 hover:border-primary transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{pack.quantity}</span>
                      <span className="text-sm text-muted-foreground">messages</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">${pack.price.toFixed(2)}</span>
                      {pack.discount_percentage > 0 && (
                        <Badge variant="secondary" className="text-xs text-green-600">
                          -{pack.discount_percentage}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handlePurchasePack(pack.id)}
                    disabled={purchasing}
                    size="sm"
                    variant="outline"
                  >
                    {purchasing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Buy
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Funds Option */}
      {pricePerMessage > 0 && (
        <div className="pt-4 border-t">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/wallet')}
          >
            <Wallet className="h-4 w-4 mr-2" />
            Add Funds to Wallet (Pay per message)
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Add ${pricePerMessage.toFixed(2)} or more to send messages without a subscription
          </p>
        </div>
      )}

      {/* No options available */}
      {!hasTiers && !hasPacks && pricePerMessage === 0 && (
        <div className="text-center py-4">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">
            Messaging is not available for this creator
          </p>
        </div>
      )}
    </div>
  );
};
