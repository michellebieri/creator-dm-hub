import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const { data: transactions } = await supabase
      .from('transactions')
      .select('net_amount')
      .eq('creator_id', user.id)
      .eq('status', 'completed');

    const total = transactions?.reduce((sum, t) => sum + t.net_amount, 0) || 0;
    setEarnings(total);

    const { data: payouts } = await supabase
      .from('payouts')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false});

    setPendingPayouts(payouts || []);

    const { data: settings } = await supabase
      .from('creator_settings')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single();

    setStripeConnected(!!settings?.stripe_account_id);
  };

  const connectStripe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Redirecting to Stripe. Complete setup to connect your account.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect Stripe account');
    }
  };

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
      await fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Payout Settings</h1>

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
              <h2 className="text-2xl font-bold">Stripe Connection</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Status: {stripeConnected ? 'Connected' : 'Not Connected'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stripeConnected
                    ? 'Your Stripe account is connected'
                    : 'Connect your Stripe account to receive payouts'}
                </p>
              </div>
              <Button 
                variant="outline" 
                disabled={stripeConnected}
                onClick={connectStripe}
              >
                {stripeConnected ? "Connected" : "Connect Stripe"}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Payout History</h2>
            </div>
            <div className="space-y-3">
              {pendingPayouts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No payout history yet
                </p>
              ) : (
                pendingPayouts.map((payout: any) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-4 border rounded"
                  >
                    <div>
                      <p className="font-medium">${payout.amount.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium capitalize">{payout.status}</p>
                      {payout.completed_at && (
                        <p className="text-sm text-muted-foreground">
                          Completed {new Date(payout.completed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PayoutSettings;
