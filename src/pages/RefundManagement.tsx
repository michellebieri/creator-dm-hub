import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Transaction {
  id: string;
  amount: number;
  created_at: string;
  transaction_type: string;
  customer: { display_name: string; username: string };
}

export default function RefundManagement() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch refunds
      const { data: refundData, error: refundError } = await supabase
        .from('refunds')
        .select(`
          *,
          transaction:transactions(
            id,
            amount,
            created_at,
            transaction_type,
            customer:profiles!transactions_customer_id_fkey(display_name, username)
          )
        `)
        .eq('transaction.creator_id', user.id)
        .order('created_at', { ascending: false });

      if (refundError) throw refundError;
      setRefunds(refundData || []);

      // Fetch recent completed transactions (eligible for refunds)
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          created_at,
          transaction_type,
          customer:profiles!transactions_customer_id_fkey(display_name, username)
        `)
        .eq('creator_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (txError) throw txError;
      setTransactions(txData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load refund data');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!selectedTransaction || !refundAmount) {
      toast.error('Please select a transaction and enter refund amount');
      return;
    }

    const amount = parseFloat(refundAmount);
    if (amount <= 0 || amount > selectedTransaction.amount) {
      toast.error('Invalid refund amount');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('refunds')
        .insert({
          transaction_id: selectedTransaction.id,
          amount,
          reason: refundReason,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Refund request submitted successfully');
      setSelectedTransaction(null);
      setRefundAmount('');
      setRefundReason('');
      fetchData();
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast.error(error.message || 'Failed to process refund');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'completed':
        return 'bg-green-500/10 text-green-500';
      case 'failed':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading || authLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Refund Management</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Process New Refund</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Process Refund</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Transaction</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto mt-2">
                    {transactions.map((tx) => (
                      <button
                        key={tx.id}
                        onClick={() => {
                          setSelectedTransaction(tx);
                          setRefundAmount(tx.amount.toString());
                        }}
                        className={`w-full p-3 text-left rounded-lg border transition-colors ${
                          selectedTransaction?.id === tx.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{tx.customer.display_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {tx.transaction_type} • {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="font-bold">${tx.amount.toFixed(2)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedTransaction && (
                  <>
                    <div>
                      <Label>Refund Amount ($)</Label>
                      <Input
                        type="number"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        max={selectedTransaction.amount}
                        min="0"
                        step="0.01"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Max: ${selectedTransaction.amount.toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <Label>Reason (Optional)</Label>
                      <Textarea
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder="Explain why this refund is being processed..."
                        rows={3}
                      />
                    </div>

                    <Button onClick={handleProcessRefund} disabled={processing} className="w-full">
                      {processing ? 'Processing...' : 'Process Refund'}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">Refund History</h2>
          {refunds.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No refunds processed yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {refunds.map((refund) => (
                <div key={refund.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium">
                        {refund.transaction.customer.display_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(refund.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(refund.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(refund.status)}
                        {refund.status}
                      </span>
                    </Badge>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Original: ${refund.transaction.amount.toFixed(2)}
                      </p>
                      {refund.reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Reason: {refund.reason}
                        </p>
                      )}
                    </div>
                    <p className="text-xl font-bold text-destructive">
                      -${refund.amount.toFixed(2)}
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
}
