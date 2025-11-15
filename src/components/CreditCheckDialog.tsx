import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ShoppingCart, MessageCircle, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface MessagePack {
  id: string;
  quantity: number;
  price: number;
  discount_percentage: number;
}

interface CreditCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorName: string;
  pricePerMessage: number;
  onProceedToChat: () => void;
}

export const CreditCheckDialog = ({
  open,
  onOpenChange,
  creatorId,
  creatorName,
  pricePerMessage,
  onProceedToChat,
}: CreditCheckDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [packs, setPacks] = useState<MessagePack[]>([]);

  useEffect(() => {
    if (open && user && creatorId) {
      checkCredits();
      fetchMessagePacks();
    }
  }, [open, user, creatorId]);

  const checkCredits = async () => {
    if (!user || !creatorId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('customer_credits')
      .select('credits_remaining')
      .eq('customer_id', user.id)
      .eq('creator_id', creatorId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching credits:', error);
    }
    
    setCredits(data?.credits_remaining || 0);
    setLoading(false);
  };

  const fetchMessagePacks = async () => {
    const { data, error } = await supabase
      .from('message_packs')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('is_active', true)
      .order('quantity', { ascending: true });

    if (error) {
      console.error('Error fetching packs:', error);
    } else {
      setPacks(data || []);
    }
  };

  const handlePurchase = async (packId: string) => {
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
          description: "Complete your purchase in the new tab. Apple Pay available if supported.",
        });
        
        // Poll for credit updates after payment window opens
        const pollInterval = setInterval(async () => {
          await checkCredits();
        }, 3000);

        // Stop polling after 2 minutes
        setTimeout(() => clearInterval(pollInterval), 120000);
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

  const handleProceed = () => {
    onOpenChange(false);
    onProceedToChat();
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const hasCredits = (credits || 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {hasCredits ? 'Ready to Chat' : 'Purchase Message Credits'}
          </DialogTitle>
          <DialogDescription>
            {hasCredits
              ? `You have ${credits} message credit${credits === 1 ? '' : 's'} for ${creatorName}`
              : `Chat with ${creatorName} for $${pricePerMessage.toFixed(2)} per message`}
          </DialogDescription>
        </DialogHeader>

        {hasCredits ? (
          <div className="space-y-4">
            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-3xl font-bold">{credits}</p>
                  <p className="text-sm text-muted-foreground">message credit{credits === 1 ? '' : 's'}</p>
                </div>
                <MessageCircle className="h-12 w-12 text-primary opacity-20" />
              </div>
            </Card>

            <Button onClick={handleProceed} className="w-full" size="lg">
              <MessageCircle className="mr-2 h-4 w-4" />
              Start Chatting with {creatorName}
            </Button>

            {packs.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">Need more credits?</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {packs.map((pack) => (
                    <Card key={pack.id} className="p-3">
                      <div className="space-y-2">
                        <div className="text-center">
                          <div className="text-xl font-bold">{pack.quantity}</div>
                          <div className="text-xs text-muted-foreground">Messages</div>
                        </div>
                        <div className="text-center text-lg font-semibold">
                          ${pack.price.toFixed(2)}
                        </div>
                        {pack.discount_percentage > 0 && (
                          <div className="text-xs text-center text-green-600 font-medium">
                            Save {pack.discount_percentage}%
                          </div>
                        )}
                        <Button
                          onClick={() => handlePurchase(pack.id)}
                          disabled={purchasing}
                          size="sm"
                          variant="outline"
                          className="w-full"
                        >
                          {purchasing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <ShoppingCart className="w-3 h-3 mr-1" />
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
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                You don't have any message credits for {creatorName} yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Purchase a message pack below to start chatting!
              </p>
            </div>

            {packs.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {packs.map((pack) => (
                  <Card key={pack.id} className="p-4">
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{pack.quantity}</div>
                        <div className="text-sm text-muted-foreground">Messages</div>
                      </div>
                      <div className="text-center text-xl font-semibold">
                        ${pack.price.toFixed(2)}
                      </div>
                      {pack.discount_percentage > 0 && (
                        <div className="text-sm text-center text-green-600 font-medium">
                          Save {pack.discount_percentage}%
                        </div>
                      )}
                      <Button
                        onClick={() => handlePurchase(pack.id)}
                        disabled={purchasing}
                        className="w-full"
                      >
                        {purchasing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Buy Now
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No message packs available. Contact {creatorName} for pricing.
                </p>
              </div>
            )}

            <div className="text-xs text-center text-muted-foreground pt-2 border-t">
              💳 Pay with Card or 🍎 Apple Pay (when available in checkout)
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
