import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, MessageCircle, Wallet, Plus, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { EmbeddedPaymentForm } from '@/components/EmbeddedPaymentForm';
import { ApplePayButton } from '@/components/ApplePayButton';
import { supabase } from '@/integrations/supabase/client';

const stripePromise = loadStripe('pk_live_51KJa0iHBEe0ePTRxLfnSn02kit9LiRIKjmDAyZAg50yWiwiwej93OEsmZYDsSjChdXzeNrXCVlbifNJLeQ67zT8E00WdXKm0Y6');

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
  const { toast } = useToast();
  const { balance, loading } = useWallet();
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const presetAmounts = [10, 25, 50, 100];
  const hasEnoughBalance = balance >= pricePerMessage;

  const handleSelectAmount = async (amount: number) => {
    setProcessing(true);
    setSelectedAmount(amount);
    
    try {
      const { data, error } = await supabase.functions.invoke('add-funds', {
        body: { amount },
      });

      if (error) throw error;
      
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to initialize payment",
        variant: "destructive",
      });
      setSelectedAmount(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleCustomAmount = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    handleSelectAmount(amount);
  };

  const handlePaymentSuccess = (newBalance: number) => {
    setSelectedAmount(null);
    setClientSecret(null);
    setCustomAmount('');
    toast({
      title: "Success!",
      description: `Your wallet balance is now $${newBalance.toFixed(2)}`,
    });
  };

  const handleCancel = () => {
    setSelectedAmount(null);
    setClientSecret(null);
  };

  const handleProceed = () => {
    if (!hasEnoughBalance) {
      toast({
        title: "Insufficient balance",
        description: `You need at least $${pricePerMessage.toFixed(2)} to send a message`,
        variant: "destructive",
      });
      return;
    }
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

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        setSelectedAmount(null);
        setClientSecret(null);
        setCustomAmount('');
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedAmount && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="p-0 h-auto"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Wallet className="h-5 w-5" />
            {selectedAmount 
              ? 'Payment Details'
              : hasEnoughBalance ? 'Ready to Chat' : 'Add Funds to Chat'}
          </DialogTitle>
          <DialogDescription>
            {selectedAmount
              ? 'Enter your payment details below'
              : hasEnoughBalance
              ? `You have $${balance.toFixed(2)} in your wallet`
              : `Add funds to chat with ${creatorName} ($${pricePerMessage.toFixed(2)}/message)`}
          </DialogDescription>
        </DialogHeader>

        {!selectedAmount ? (
          hasEnoughBalance ? (
          <div className="space-y-4">
            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Wallet Balance</p>
                  <p className="text-3xl font-bold">${balance.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Available for all creators</p>
                </div>
                <Wallet className="h-12 w-12 text-primary opacity-20" />
              </div>
            </Card>

            <Button onClick={handleProceed} className="w-full" size="lg">
              <MessageCircle className="mr-2 h-4 w-4" />
              Start Chatting with {creatorName}
            </Button>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">Add more funds anytime</p>
              <div className="grid grid-cols-4 gap-2">
                {presetAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAmount(amount)}
                    disabled={processing}
                  >
                    {processing ? '...' : `$${amount}`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="p-6 bg-muted/50">
              <div className="text-center space-y-2">
                <Wallet className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Current balance: ${balance.toFixed(2)}
                </p>
                <p className="text-sm font-medium">
                  You need $${pricePerMessage.toFixed(2)} to send a message
                </p>
              </div>
            </Card>

            <div>
              <Label>Quick add</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {presetAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => handleSelectAmount(amount)}
                    disabled={processing}
                  >
                    {processing ? '...' : `$${amount}`}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="custom-amount">Custom amount</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  disabled={processing}
                />
                <Button
                  onClick={handleCustomAmount}
                  disabled={processing || !customAmount}
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" />Add</>}
                </Button>
              </div>
            </div>

            {selectedAmount && (
              <Elements stripe={stripePromise}>
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Or pay with:</div>
                  <ApplePayButton
                    amount={selectedAmount}
                    onSuccess={handlePaymentSuccess}
                    onError={() => {
                      setSelectedAmount(null);
                      setProcessing(false);
                    }}
                  />
                </div>
              </Elements>
            )}

            <div className="text-xs text-center text-muted-foreground pt-2 border-t">
              💳 Credit/Debit Card • 🍎 Apple Pay (when available)<br />
              Balance can be used for messages, tips, subscriptions, and content from any creator
            </div>
          </div>
        )) : clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <EmbeddedPaymentForm
              amount={selectedAmount}
              onSuccess={handlePaymentSuccess}
              onCancel={handleCancel}
            />
          </Elements>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
