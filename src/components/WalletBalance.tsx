import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Wallet, Plus } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AddFundsDialog } from '@/components/AddFundsDialog';

export const WalletBalance = () => {
  const { balance, loading } = useWallet();
  const { toast } = useToast();
  const [showAddFunds, setShowAddFunds] = useState(false);

  const handlePaymentSuccess = (newBalance: number) => {
    setShowAddFunds(false);
    toast({
      title: "Success!",
      description: `Your wallet balance is now $${newBalance.toFixed(2)}`,
    });
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

      <AddFundsDialog
        open={showAddFunds}
        onOpenChange={setShowAddFunds}
        currentBalance={balance}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
};
