import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Wallet, Plus } from 'lucide-react';
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

export const WalletBalance = () => {
  const { balance, loading, addFunds } = useWallet();
  const { toast } = useToast();
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const presetAmounts = [10, 25, 50, 100];

  const handleAddFunds = async (amount: number) => {
    setProcessing(true);
    try {
      const url = await addFunds(amount);
      if (url) {
        window.open(url, '_blank');
        toast({
          title: "Opening checkout",
          description: "Complete your payment in the new tab. Supports Apple Pay and credit cards.",
        });
        setShowAddFunds(false);
      }
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
    handleAddFunds(amount);
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

      <Dialog open={showAddFunds} onOpenChange={setShowAddFunds}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Funds to Wallet</DialogTitle>
            <DialogDescription>
              Add funds to use for messages, tips, subscriptions, and content from any creator
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Quick amounts</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {presetAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => handleAddFunds(amount)}
                    disabled={processing}
                  >
                    ${amount}
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
                />
                <Button
                  onClick={handleCustomAmount}
                  disabled={processing || !customAmount}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="text-xs text-center text-muted-foreground pt-2 border-t">
              💳 Credit/Debit Card • 🍎 Apple Pay (when available)
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
