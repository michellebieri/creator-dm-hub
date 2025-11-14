import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, CreditCard, Calendar } from 'lucide-react';

const PayoutSettings = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [earnings, setEarnings] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch total earnings
      const { data: transactions } = await supabase
        .from('transactions')
        .select('net_amount')
        .eq('creator_id', user.id)
        .eq('status', 'completed');

      const total = transactions?.reduce((sum, t) => sum + t.net_amount, 0) || 0;
      setEarnings(total);

      // Fetch pending payouts
      const { data: payouts } = await supabase
        .from('payouts')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      setPendingPayouts(payouts || []);

      // Check if Stripe is connected
      const { data: settings } = await supabase
        .from('creator_settings')
        .select('stripe_account_id')
        .eq('user_id', user.id)
        .single();

      setStripeConnected(!!settings?.stripe_account_id);
    };

    fetchData();
  }, [user]);

  const requestPayout = async () => {
    if (!user || earnings < 10) {
      toast.error('Minimum payout amount is $10');
      return;
    }

    if (!stripeConnected) {
      toast.error('Connect your Stripe account first');
      return;
    }

    setRequesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-payout', {
        body: { amount: earnings },
      });

      if (error) throw error;

      toast.success('Payout requested! Funds will be transferred within 24 hours.');
      
      // Refresh data
      const { data: payouts } = await supabase
        .from('payouts')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      setPendingPayouts(payouts || []);
      setEarnings(0);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Payout Settings</h1>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        <div className="grid gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Available Earnings</h2>
            </div>
            <div className="text-4xl font-bold mb-4">${earnings.toFixed(2)}</div>
            <Button
              onClick={requestPayout}
              disabled={earnings < 10 || !stripeConnected || requesting}
              className="w-full"
            >
              Request Payout
            </Button>
            {earnings < 10 && (
              <p className="text-sm text-muted-foreground mt-2">
                Minimum payout amount is $10.00
              </p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Stripe Account</h2>
            </div>
            {stripeConnected ? (
              <div className="flex items-center gap-2 text-success">
                <div className="h-2 w-2 rounded-full bg-success"></div>
                <span>Connected</span>
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground mb-4">
                  Connect your Stripe account to receive payouts
                </p>
                <Button>Connect Stripe</Button>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Payout History</h2>
            </div>
            {pendingPayouts.length === 0 ? (
              <p className="text-muted-foreground">No payouts yet</p>
            ) : (
              <div className="space-y-3">
                {pendingPayouts.map((payout: any) => (
                  <div
                    key={payout.id}
                    className="flex justify-between items-center p-3 border rounded"
                  >
                    <div>
                      <p className="font-semibold">${payout.amount.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded text-sm ${
                        payout.status === 'completed'
                          ? 'bg-success/10 text-success'
                          : payout.status === 'pending'
                          ? 'bg-accent/10 text-accent'
                          : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {payout.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PayoutSettings;
