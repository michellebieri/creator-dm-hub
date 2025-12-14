import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, DollarSign, TrendingUp, Wallet, ExternalLink, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';

interface RevenueData {
  stripeConnected: boolean;
  stripeStatus: string;
  totalEarnings: number;
  totalPlatformFees: number;
  totalGross: number;
  pendingEarnings: number;
  recentTransactions: Array<{
    id: string;
    gross_amount: number;
    platform_fee_amount: number;
    creator_net_amount: number;
    status: string;
    created_at: string;
  }>;
  monthlyBreakdown: Array<{
    month: string;
    gross: number;
    fees: number;
    net: number;
  }>;
}

export default function CreatorRevenue() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: "Stripe Connected!",
        description: "Your Stripe account has been successfully connected.",
      });
    }
    if (searchParams.get('refresh') === 'true') {
      toast({
        title: "Connection Incomplete",
        description: "Please complete your Stripe account setup.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  useEffect(() => {
    if (user) {
      fetchRevenueData();
    }
  }, [user]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-creator-revenue');
      
      if (error) throw error;
      setRevenueData(data);
    } catch (error) {
      console.error('Error fetching revenue:', error);
      toast({
        title: "Error",
        description: "Failed to load revenue data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    try {
      setConnecting(true);
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboarding');
      
      if (error) throw error;
      
      if (data.status === 'active') {
        toast({
          title: "Already Connected",
          description: "Your Stripe account is fully connected.",
        });
        fetchRevenueData();
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      toast({
        title: "Error",
        description: "Failed to start Stripe connection",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center gap-4 h-16 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">My Revenue</h1>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={fetchRevenueData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Stripe Connection Card */}
        <Card className={revenueData?.stripeConnected ? 'border-green-500/50 bg-green-500/5' : 'border-yellow-500/50 bg-yellow-500/5'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Stripe Connect Status
            </CardTitle>
            <CardDescription>
              {revenueData?.stripeConnected 
                ? 'Your Stripe account is connected. You receive 80% of all payments.'
                : 'Connect your Stripe account to receive payments (80% of earnings).'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {revenueData?.stripeConnected ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Connected & Active</span>
              </div>
            ) : (
              <Button onClick={handleConnectStripe} disabled={connecting}>
                {connecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect Stripe Account
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Revenue Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Earnings (80%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${revenueData?.totalEarnings.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Gross
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${revenueData?.totalGross.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Platform Fees (20%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                ${revenueData?.totalPlatformFees.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ${revenueData?.pendingEarnings.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Breakdown */}
        {revenueData?.monthlyBreakdown && revenueData.monthlyBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Platform Fee</TableHead>
                    <TableHead className="text-right">Your Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueData.monthlyBreakdown.map((month) => (
                    <TableRow key={month.month}>
                      <TableCell className="font-medium">
                        {new Date(month.month + '-01').toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </TableCell>
                      <TableCell className="text-right">${month.gross.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        -${month.fees.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        ${month.net.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData?.recentTransactions && revenueData.recentTransactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Fee (20%)</TableHead>
                    <TableHead className="text-right">Your Share (80%)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueData.recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {new Date(tx.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${Number(tx.gross_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        -${Number(tx.platform_fee_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        ${Number(tx.creator_net_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet. Start earning by selling content!
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
