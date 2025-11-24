import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, Wallet as WalletIcon, Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { format } from 'date-fns';
import { AddFundsDialog } from '@/components/AddFundsDialog';

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  balance_after: number;
  created_at: string;
  payment_method?: string;
}

const Wallet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance, loading } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [showAddFunds, setShowAddFunds] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
      } else {
        setTransactions(data || []);
      }
      setLoadingTransactions(false);
    };

    fetchTransactions();

    // Subscribe to new transactions
    const channel = supabase
      .channel(`wallet-transactions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setTransactions((prev) => [payload.new as Transaction, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getTransactionIcon = (amount: number) => {
    return amount > 0 ? (
      <ArrowUpCircle className="h-5 w-5 text-green-500" />
    ) : (
      <ArrowDownCircle className="h-5 w-5 text-red-500" />
    );
  };

  const formatTransactionType = (type: string) => {
    const types: Record<string, string> = {
      'deposit': 'Added Funds',
      'purchase': 'Purchase',
      'unlock': 'Unlocked Content',
      'message': 'Message Purchase',
      'bundle': 'Bundle Purchase',
      'tip': 'Tip Sent',
      'refund': 'Refund'
    };
    return types[type] || type;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Wallet</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4 space-y-6">
        {/* Current Balance Section */}
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <WalletIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                <p className="text-4xl font-bold">
                  {loading ? '...' : `$${balance.toFixed(2)}`}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowAddFunds(true)}
              size="lg"
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Funds
            </Button>
          </div>
        </Card>

        {/* Payment History Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Payment History</h2>
          
          {loadingTransactions ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your payment history will appear here
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <Card key={transaction.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {getTransactionIcon(transaction.amount)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            {formatTransactionType(transaction.transaction_type)}
                          </p>
                          <p className={`font-semibold ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                          </p>
                        </div>
                        {transaction.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {transaction.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transaction.created_at), 'MMM dd, yyyy • h:mm a')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Balance: ${transaction.balance_after.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddFundsDialog
        open={showAddFunds}
        onOpenChange={setShowAddFunds}
        currentBalance={balance}
        onSuccess={(newBalance) => {
          setShowAddFunds(false);
        }}
      />
    </div>
  );
};

export default Wallet;
