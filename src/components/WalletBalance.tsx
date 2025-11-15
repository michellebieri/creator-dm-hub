import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Wallet, Plus, ArrowLeft } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { EmbeddedPaymentForm } from '@/components/EmbeddedPaymentForm';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const stripePromise = loadStripe('pk_live_51KJa0iHBEe0ePTRxLfnSn02kit9LiRIKjmDAyZAg50yWiwiwej93OEsmZYDsSjChdXzeNrXCVlbifNJLeQ67zT8E00WdXKm0Y6');

export const WalletBalance = () => {
  const { balance, loading } = useWallet();
  const { toast } = useToast();
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const presetAmounts = [10, 25, 50, 100];

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
    setShowAddFunds(false);
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

  if (loading) return null;

  return (
    <>
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-primary" />
            <div>
              <div className="text-sm text-muted-foreground">Wallet Balance</div>
              <div className="text-2xl font-bold">${balance.toFixed(2)}</div>
            </div>
          </div>
          <Button
            onClick={() => setShowAddFunds(true)}
            size="sm"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add More
          </Button>
        </div>
      </Card>

      <Dialog open={showAddFunds} onOpenChange={(open) => {
        setShowAddFunds(open);
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
              {selectedAmount ? 'Payment Details' : 'Add Funds to Wallet'}
            </DialogTitle>
            <DialogDescription>
              {selectedAmount 
                ? 'Enter your payment details below'
                : 'Add funds to use for messages, tips, subscriptions, and content from any creator'}
            </DialogDescription>
          </DialogHeader>

          {!selectedAmount ? (
            <div className="space-y-4">
              <div>
                <Label>Quick amounts</Label>
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
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-center text-muted-foreground pt-2 border-t">
                💳 Credit/Debit Card • 🍎 Apple Pay (when available)
              </div>
            </div>
          ) : clientSecret ? (
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
    </>
  );
};
