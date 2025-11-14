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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Earnings Dashboard</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/payout-settings')}>
              <CreditCard className="h-4 w-4 mr-2" />
              Payouts
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-medium text-muted-foreground">Total Earnings</h3>
            </div>
            <p className="text-3xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <h3 className="text-sm font-medium text-muted-foreground">This Month</h3>
            </div>
            <p className="text-3xl font-bold">${stats.thisMonth.toFixed(2)}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-accent" />
              <h3 className="text-sm font-medium text-muted-foreground">Pending Payouts</h3>
            </div>
            <p className="text-3xl font-bold">${stats.pendingPayouts.toFixed(2)}</p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Recent Transactions</h2>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex justify-between items-center p-4 border rounded hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-semibold capitalize">{tx.transaction_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">+${tx.net_amount.toFixed(2)}</p>
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
