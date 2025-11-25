import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { EmbeddedPaymentForm } from '@/components/EmbeddedPaymentForm';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Wallet, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const stripePromise = loadStripe('pk_test_51KJa0iHBEe0ePTRxZRxHQbGZrDBPKKxBIVhLpZ1xV8LDI89zBQxmFPhMLhBanJ805tTGcNsjJYcsuCF1LyrGeDMo00HQQ5Jf3m');

interface AddFundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredAmount?: number;
  currentBalance?: number;
  onSuccess?: (newBalance: number) => void;
}

export function AddFundsDialog({ 
  open, 
  onOpenChange, 
  requiredAmount, 
  currentBalance = 0,
  onSuccess 
}: AddFundsDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Check authentication when dialog opens
  useEffect(() => {
    if (open && !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add funds to your wallet",
        variant: "destructive",
      });
      onOpenChange(false);
      navigate('/auth');
    }
  }, [open, user, onOpenChange, navigate, toast]);

  const presetAmounts = [20, 50, 100, 200];
  const shortfall = requiredAmount ? Math.max(0, requiredAmount - currentBalance) : 0;

  const handleSelectAmount = async (amount: number) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add funds",
        variant: "destructive",
      });
      return;
    }

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
    onOpenChange(false);
    if (onSuccess) {
      onSuccess(newBalance);
    }
    // Redirect to wallet overview after successful payment
    navigate('/wallet');
  };

  const handleCancel = () => {
    setSelectedAmount(null);
    setClientSecret(null);
  };

  const handleClose = () => {
    setSelectedAmount(null);
    setClientSecret(null);
    setCustomAmount('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            {requiredAmount ? 'Insufficient Balance' : 'Add Funds'}
          </DialogTitle>
          {requiredAmount ? (
            <DialogDescription>
              You need ${requiredAmount.toFixed(2)} to complete this purchase.
              <br />
              Your current balance: ${currentBalance.toFixed(2)}
              <br />
              Additional funds needed: ${shortfall.toFixed(2)}
            </DialogDescription>
          ) : (
            <DialogDescription>
              Add funds to your wallet to unlock content and send messages.
            </DialogDescription>
          )}
        </DialogHeader>

        {!clientSecret ? (
          <div className="space-y-4">
            {/* Preset amounts */}
            <div className="space-y-2">
              <Label>Select Amount</Label>
              <div className="grid grid-cols-2 gap-2">
                {presetAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => handleSelectAmount(amount)}
                    disabled={processing}
                    className="h-12 text-lg font-semibold"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div className="space-y-2">
              <Label htmlFor="custom-amount">Custom Amount</Label>
              <div className="flex gap-2">
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
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Add'
                  )}
                </Button>
              </div>
            </div>

            {shortfall > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  💡 Tip: Add at least ${shortfall.toFixed(2)} to complete your purchase
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to amounts
            </Button>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount to add:</span>
                <span className="font-semibold">${selectedAmount}</span>
              </div>
            </div>

            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedPaymentForm 
                amount={selectedAmount}
                onSuccess={handlePaymentSuccess}
                onCancel={handleCancel}
              />
            </Elements>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
