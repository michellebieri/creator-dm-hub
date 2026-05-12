import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, Calendar, CreditCard, ChevronLeft } from 'lucide-react';

const EarningsDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEarnings: 0,
    thisMonth: 0,
    pendingPayouts: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch transactions
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('*, customer:customer_id(display_name)')
          .eq('creator_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20);

        if (txError) throw txError;

        // Enrich transactions with bundle/content names
        const enrichedTx = await Promise.all((txData || []).map(async (tx) => {
          let itemName = '';
          if (tx.bundle_id) {
            const { data: bundle } = await supabase
              .from('content_bundles')
              .select('title')
              .eq('id', tx.bundle_id)
              .single();
            itemName = bundle?.title || 'Bundle';
          }
          return { ...tx, itemName };
        }));

        setTransactions(enrichedTx);

        // Calculate stats
        const total = txData?.reduce((sum, t) => sum + t.net_amount, 0) || 0;
        
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthTx = txData?.filter(
          (t) => new Date(t.created_at) >= firstDayOfMonth
        );
        const thisMonth = thisMonthTx?.reduce((sum, t) => sum + t.net_amount, 0) || 0;

        // Fetch pending payouts
        const { data: payoutData } = await supabase
          .from('payouts')
          .select('amount')
          .eq('creator_id', user.id)
          .eq('status', 'pending');

        const pending = payoutData?.reduce((sum, p) => sum + p.amount, 0) || 0;

        setStats({
          totalEarnings: total,
          thisMonth,
          pendingPayouts: pending,
        });
      } catch (error) {
        console.error('Error fetching earnings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading || authLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-6xl mx-auto">
          <div className="w-10" />
          <h1 className="text-lg font-semibold">Revenue</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Revenue Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your earnings and financial performance</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Total Earnings</h3>
            </div>
            <p className="text-3xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">This Month</h3>
            </div>
            <p className="text-3xl font-bold">${stats.thisMonth.toFixed(2)}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Pending Payouts</h3>
            </div>
            <p className="text-3xl font-bold">${stats.pendingPayouts.toFixed(2)}</p>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
          </div>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex justify-between items-center p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {tx.transaction_type === 'subscription'
                        ? 'Subscription'
                        : tx.transaction_type === 'message'
                          ? 'Message'
                          : (tx.transaction_type === 'pack' || (tx.transaction_type === 'unlockable' && tx.bundle_id))
                            ? 'Bundle Purchase'
                            : tx.transaction_type === 'unlockable'
                              ? 'Content Purchase'
                              : tx.transaction_type.replace(/_/g, ' ')}
                    </p>
                    {tx.itemName && (
                      <p className="text-sm font-medium text-primary">{tx.itemName}</p>
                    )}
                    {tx.customer?.display_name && (
                      <p className="text-xs text-muted-foreground">From: {tx.customer.display_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">+${tx.net_amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      Gross: ${tx.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default EarningsDashboard;
