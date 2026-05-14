import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MessagePack {
  id: string;
  quantity: number;
  price: number;
  discount_percentage: number;
}

interface MessagePackPurchaseProps {
  creatorId: string;
  packs: MessagePack[];
}

export const MessagePackPurchase = ({ creatorId, packs }: MessagePackPurchaseProps) => {
  const [purchasing, setPurchasing] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async (packId: string) => {
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { packId, creatorId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      // Surface the real edge function error (default error.message is the
      // generic "Edge Function returned a non-2xx status code"; the actual
      // reason is in the response body, accessible via error.context).
      let detail = error?.message ?? 'unknown';
      try {
        const body = await error?.context?.json?.();
        if (body?.error) detail = body.error;
      } catch (_) { /* leave generic */ }
      toast({
        title: "Purchase failed",
        description: detail,
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (!packs || packs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Purchase Message Credits</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {packs.map((pack) => (
          <Card key={pack.id} className="p-4">
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold">{pack.quantity}</div>
                <div className="text-sm text-muted-foreground">Messages</div>
              </div>
              <div className="text-xl font-semibold">
                ${pack.price.toFixed(2)}
              </div>
              {pack.discount_percentage > 0 && (
                <div className="text-sm text-primary font-medium">
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
    </div>
  );
};
