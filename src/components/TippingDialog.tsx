import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Wallet } from 'lucide-react';

interface TippingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorName: string;
}

export const TippingDialog = ({ open, onOpenChange, creatorId, creatorName }: TippingDialogProps) => {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { balance, spend } = useWallet();

  const handleTip = async () => {
    const tipAmount = parseFloat(amount);
    if (!tipAmount || tipAmount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid tip amount", variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to send a tip", variant: "destructive" });
      return;
    }

    if (balance < tipAmount) {
      toast({
        title: "Insufficient balance",
        description: `You need $${tipAmount.toFixed(2)} in your wallet. Current balance: $${balance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Deduct from wallet — same flow as inline tips in MessagingInterface
      const success = await spend(
        tipAmount,
        'tip',
        message ? `Tip: ${message}` : `Tip to ${creatorName}`,
        creatorId
      );

      if (!success) {
        toast({ title: "Payment failed", description: "Failed to process tip", variant: "destructive" });
        return;
      }

      // Record creator earnings (tip is categorised as 'message' transaction type)
      await supabase.rpc('insert_completed_transaction', {
        p_creator_id: creatorId,
        p_amount: tipAmount,
        p_transaction_type: 'message',
      });

      // Notify creator — fire-and-forget
      supabase.functions.invoke('create-notification', {
        body: {
          userId: creatorId,
          type: 'tip_received',
          title: '💝 Tip Received!',
          message: `You received a $${tipAmount.toFixed(2)} tip${message ? `: "${message}"` : ''}`,
          link: '/creator-revenue',
        },
      }).catch(err => console.log('Tip notification error (non-fatal):', err));

      toast({ title: "Tip sent!", description: `$${tipAmount.toFixed(2)} sent to ${creatorName}` });
      setAmount('');
      setMessage('');
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Failed to send tip", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [5, 10, 20, 50];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Tip to {creatorName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Wallet balance reminder */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
            <Wallet className="h-4 w-4" />
            <span>Wallet balance: <span className="font-medium text-foreground">${balance.toFixed(2)}</span></span>
          </div>

          <div className="flex gap-2">
            {quickAmounts.map((amt) => (
              <Button
                key={amt}
                variant={amount === amt.toString() ? 'default' : 'outline'}
                onClick={() => setAmount(amt.toString())}
                className="flex-1"
              >
                ${amt}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Custom Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                min="0.01"
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message with your tip..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={handleTip} disabled={loading || !amount} className="w-full">
            {loading ? 'Processing...' : `Send $${amount || '0'} Tip`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
