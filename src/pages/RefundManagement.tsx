import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, AlertCircle, CheckCircle, Clock, Shield } from 'lucide-react';
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
  const { isAdmin, loading: roleLoading } = useRoleCheck();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [allRefunds, setAllRefunds] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && !roleLoading) fetchData();
  }, [user, isAdmin, roleLoading]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: refundData } = await supabase
        .from('refunds')
        .select('*, transaction:transactions(id, amount, created_at, transaction_type, customer:profiles!transactions_customer_id_fkey(display_name, username))')
        .eq('transaction.creator_id', user.id)
        .order('created_at', { ascending: false });
      setRefunds(refundData || []);
      
      if (isAdmin) {
        const { data: allRefundData } = await supabase
          .from('refunds')
          .select('*, transaction:transactions(id, amount, created_at, transaction_type, creator:profiles!transactions_creator_id_fkey(display_name, username), customer:profiles!transactions_customer_id_fkey(display_name, username))')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        setAllRefunds(allRefundData || []);
      }
      
      const { data: txData } = await supabase
        .from('transactions')
        .select('id, amount, created_at, transaction_type, customer:profiles!transactions_customer_id_fkey(display_name, username)')
        .eq('creator_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);
      setTransactions(txData || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!selectedTransaction || !refundAmount) return toast.error('Invalid input');
    const amount = parseFloat(refundAmount);
    if (amount <= 0 || amount > selectedTransaction.amount) return toast.error('Invalid amount');
    
    setProcessing(true);
    try {
      await supabase.from('refunds').insert({
        transaction_id: selectedTransaction.id,
        amount,
        reason: refundReason,
        status: 'pending',
      });
      toast.success('Refund submitted');
      setSelectedTransaction(null);
      setRefundAmount('');
      setRefundReason('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleAdminAction = async (refundId: string, action: 'approve' | 'reject') => {
    setProcessing(true);
    try {
      await supabase.functions.invoke('process-refund', { body: { refundId, action } });
      toast.success(`Refund ${action}d`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading || authLoading || roleLoading) return <LoadingSpinner />;

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 flex items-center gap-2">
          <DollarSign className="h-8 w-8" />
          Refund Management
        </h1>

        <Tabs defaultValue={isAdmin ? "admin" : "creator"} className="space-y-6">
          <TabsList className={isAdmin ? "grid w-full grid-cols-3 max-w-2xl" : "grid w-full grid-cols-2 max-w-lg"}>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin ({allRefunds.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="creator">Your Refunds</TabsTrigger>
            <TabsTrigger value="new">Issue Refund</TabsTrigger>
          </TabsList>

          {isAdmin && (
            <TabsContent value="admin">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Pending Refund Requests</h2>
                {allRefunds.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                    <p>No pending refund requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allRefunds.map((r) => (
                      <div key={r.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-5 w-5" />
                          <p className="font-bold">${r.amount.toFixed(2)}</p>
                          <Badge>{r.status}</Badge>
                        </div>
                        <div className="text-sm mb-3">
                          <p><strong>Customer:</strong> {r.transaction?.customer?.display_name}</p>
                          <p><strong>Creator:</strong> {r.transaction?.creator?.display_name}</p>
                        </div>
                        {r.reason && <div className="p-2 bg-muted rounded mb-3"><p className="text-sm">{r.reason}</p></div>}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAdminAction(r.id, 'approve')} disabled={processing}>
                            <CheckCircle className="h-4 w-4 mr-2" />Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleAdminAction(r.id, 'reject')} disabled={processing}>Reject</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          )}

          <TabsContent value="creator">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">History</h2>
              {refunds.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No refunds</p>
              ) : (
                <div className="space-y-3">
                  {refunds.map((r) => (
                    <div key={r.id} className="flex justify-between p-4 border rounded">
                      <div className="flex items-center gap-3">
                        {r.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                        {r.status === 'approved' && <CheckCircle className="h-4 w-4 text-primary" />}
                        {r.status === 'rejected' && <AlertCircle className="h-4 w-4 text-destructive" />}
                        <div>
                          <p className="font-medium">${r.amount.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">{r.transaction?.customer?.display_name}</p>
                        </div>
                      </div>
                      <Badge>{r.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="new">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Issue Refund</h2>
              <div className="space-y-4">
                <div>
                  <Label>Select Transaction</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto mt-2">
                    {transactions.length === 0 ? (
                      <p className="text-sm text-center py-4 text-muted-foreground">No eligible transactions</p>
                    ) : (
                      transactions.map((tx) => (
                        <button
                          key={tx.id}
                          onClick={() => { setSelectedTransaction(tx); setRefundAmount(tx.amount.toString()); }}
                          className={`w-full p-3 text-left rounded border ${selectedTransaction?.id === tx.id ? 'border-primary bg-primary/10' : 'hover:border-primary/50'}`}
                        >
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">{tx.customer.display_name}</p>
                              <p className="text-sm text-muted-foreground">{tx.transaction_type}</p>
                            </div>
                            <p className="font-bold">${tx.amount.toFixed(2)}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {selectedTransaction && (
                  <>
                    <div>
                      <Label>Amount</Label>
                      <Input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} max={selectedTransaction.amount} step="0.01" />
                    </div>
                    <div>
                      <Label>Reason</Label>
                      <Textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={3} />
                    </div>
                    <Button onClick={handleProcessRefund} disabled={processing} className="w-full">
                      {processing ? 'Processing...' : 'Submit Refund'}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
