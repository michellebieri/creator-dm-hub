import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, Calendar, CreditCard } from 'lucide-react';

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
          .select('*')
          .eq('creator_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20);

        if (txError) throw txError;

        setTransactions(txData || []);

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
    <div className="min-h-screen bg-gradient-to-br from-lime-50/50 via-background to-yellow-50/50 dark:from-lime-950/20 dark:via-background dark:to-yellow-950/20">
      <div className="max-w-6xl mx-auto p-8">
        {/* Colorful Header */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-lime-500 to-yellow-500 text-white shadow-lg">
          <h1 className="text-4xl font-bold mb-2">Revenue Dashboard</h1>
          <p className="text-lime-50">Track your earnings and financial performance</p>
        </div>

        {/* Stats Cards with Colors */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-lime-200 dark:border-lime-900 bg-gradient-to-br from-lime-50 to-white dark:from-lime-950/50 dark:to-background shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-lime-500">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Total Earnings</h3>
            </div>
            <p className="text-3xl font-bold text-lime-600 dark:text-lime-400">${stats.totalEarnings.toFixed(2)}</p>
          </Card>

          <Card className="p-6 border-yellow-200 dark:border-yellow-900 bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/50 dark:to-background shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-yellow-500">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">This Month</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">${stats.thisMonth.toFixed(2)}</p>
          </Card>

          <Card className="p-6 border-lime-200 dark:border-lime-900 bg-gradient-to-br from-lime-50 to-white dark:from-lime-950/50 dark:to-background shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-lime-500">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Pending Payouts</h3>
            </div>
            <p className="text-3xl font-bold text-lime-600 dark:text-lime-400">${stats.pendingPayouts.toFixed(2)}</p>
          </Card>
        </div>

        <Card className="p-6 border-lime-200 dark:border-lime-900 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-lime-500 to-yellow-500">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Recent Transactions</h2>
          </div>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex justify-between items-center p-4 border border-lime-100 dark:border-lime-900 rounded-xl hover:bg-lime-50/50 dark:hover:bg-lime-950/20 transition-colors"
                >
                  <div>
                    <p className="font-semibold capitalize">{tx.transaction_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lime-600 dark:text-lime-400">+${tx.net_amount.toFixed(2)}</p>
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
