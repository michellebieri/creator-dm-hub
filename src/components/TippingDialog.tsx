import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign } from 'lucide-react';

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

  const handleTip = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid tip amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create payment intent via edge function
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          amount: parseFloat(amount) * 100, // Convert to cents
          creatorId,
          type: 'tip',
          message,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Tip initiated",
          description: "Complete payment in the new window",
        });
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({
        title: "Failed to send tip",
        description: error.message,
        variant: "destructive",
      });
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
          <div className="flex gap-2">
            {quickAmounts.map((amt) => (
              <Button
                key={amt}
                variant="outline"
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
                min="0"
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

          <Button onClick={handleTip} disabled={loading} className="w-full">
            {loading ? 'Processing...' : `Send $${amount || '0'} Tip`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
