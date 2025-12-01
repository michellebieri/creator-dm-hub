import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CustomerProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
}

interface Transaction {
  id: string;
  amount: number;
  created_at: string;
  transaction_type: string;
  status: string;
}

const CustomerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isCreator } = useRoleCheck();
  const navigate = useNavigate();
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    if (!user || !isCreator || !id) {
      navigate('/conversations');
      return;
    }

    const fetchCustomerData = async () => {
      try {
        // Fetch customer profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio')
          .eq('id', id)
          .single();

        if (profileError) throw profileError;
        setCustomerProfile(profile);

        // Fetch transactions between this customer and the current creator
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('id, amount, created_at, transaction_type, status')
          .eq('customer_id', id)
          .eq('creator_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        if (txError) throw txError;
        
        setTransactions(txData || []);
        
        // Calculate total spent
        const total = (txData || []).reduce((sum, tx) => sum + Number(tx.amount), 0);
        setTotalSpent(total);
      } catch (error) {
        console.error('Error fetching customer data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [user, isCreator, id, navigate]);

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading customer profile..." />;
  }

  if (!customerProfile) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Customer not found</p>
          <Button onClick={() => navigate('/conversations')} className="mt-4">
            Back to Messages
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/conversations')}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Customer Profile</h1>
        </div>

        {/* Profile Info */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={customerProfile.avatar_url} />
              <AvatarFallback className="text-2xl">
                {customerProfile.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{customerProfile.display_name}</h2>
              <p className="text-muted-foreground mb-3">@{customerProfile.username}</p>
              {customerProfile.bio && (
                <p className="text-foreground">{customerProfile.bio}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Payment Summary */}
        <Card className="p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Payment Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold">${totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        {/* Payment History */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Payment History</h3>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No payment history with this customer yet
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium capitalize">
                      {tx.transaction_type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${Number(tx.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{tx.status}</p>
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

export default CustomerProfile;
