import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, TrendingUp, Users, RefreshCw, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';

interface PlatformRevenueData {
  platformFeePercentage: number;
  totalPlatformRevenue: number;
  totalGrossVolume: number;
  totalCreatorPayouts: number;
  pendingPlatformRevenue: number;
  recentTransactions: Array<{
    id: string;
    gross_amount: number;
    platform_fee_amount: number;
    creator_net_amount: number;
    status: string;
    created_at: string;
    creator: {
      id: string;
      display_name: string;
      username: string;
      avatar_url: string;
    };
  }>;
  creatorBreakdown: Array<{
    creator: {
      id: string;
      display_name: string;
      username: string;
      avatar_url: string;
    };
    gross: number;
    platformFee: number;
    creatorNet: number;
    count: number;
  }>;
  monthlyBreakdown: Array<{
    month: string;
    gross: number;
    platformFee: number;
    creatorPayout: number;
    count: number;
  }>;
}

export default function AdminRevenue() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<PlatformRevenueData | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPlatformRevenue();
    }
  }, [user]);

  const fetchPlatformRevenue = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-platform-revenue');
      
      if (error) throw error;
      setRevenueData(data);
    } catch (error: any) {
      console.error('Error fetching platform revenue:', error);
      if (error.message?.includes('Only platform owner')) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this page.",
          variant: "destructive",
        });
        navigate('/');
      } else {
        toast({
          title: "Error",
          description: "Failed to load platform revenue data",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!revenueData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">You don't have permission to view this page.</p>
          <Button className="mt-4" onClick={() => navigate('/')}>Go Home</Button>
        </div>
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
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Platform Revenue Dashboard</h1>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={fetchPlatformRevenue}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Platform Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Platform Revenue ({revenueData.platformFeePercentage}%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${revenueData.totalPlatformRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Gross Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${revenueData.totalGrossVolume.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Creator Payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${revenueData.totalCreatorPayouts.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ${revenueData.pendingPlatformRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Creator Breakdown */}
        {revenueData.creatorBreakdown && revenueData.creatorBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Revenue by Creator
              </CardTitle>
              <CardDescription>
                See how much platform revenue each creator generates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Gross Volume</TableHead>
                    <TableHead className="text-right">Platform Fee</TableHead>
                    <TableHead className="text-right">Creator Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueData.creatorBreakdown.map((item) => (
                    <TableRow key={item.creator?.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={item.creator?.avatar_url} />
                            <AvatarFallback>
                              {item.creator?.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{item.creator?.display_name}</div>
                            <div className="text-sm text-muted-foreground">
                              @{item.creator?.username}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                      <TableCell className="text-right">${item.gross.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-primary font-medium">
                        ${item.platformFee.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        ${item.creatorNet.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Monthly Breakdown */}
        {revenueData.monthlyBreakdown && revenueData.monthlyBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Platform Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Gross Volume</TableHead>
                    <TableHead className="text-right">Platform Revenue</TableHead>
                    <TableHead className="text-right">Creator Payouts</TableHead>
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
                      <TableCell className="text-right">{month.count}</TableCell>
                      <TableCell className="text-right">${month.gross.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-primary font-medium">
                        ${month.platformFee.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        ${month.creatorPayout.toFixed(2)}
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
              Recent Platform Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.recentTransactions && revenueData.recentTransactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Platform Fee</TableHead>
                    <TableHead className="text-right">Creator Payout</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueData.recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {new Date(tx.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={tx.creator?.avatar_url} />
                            <AvatarFallback>
                              {tx.creator?.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{tx.creator?.display_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        ${Number(tx.gross_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-primary font-medium">
                        ${Number(tx.platform_fee_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
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
                No transactions yet.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
