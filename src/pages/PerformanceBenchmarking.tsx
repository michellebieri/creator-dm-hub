import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/StatsCard';
import { BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Award, TrendingUp, Target, Users } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Metrics {
  avgRevenue: number;
  avgCustomers: number;
  avgTransactions: number;
  avgConversionRate: number;
  avgPricePerMessage: number;
}

export default function PerformanceBenchmarking() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [myMetrics, setMyMetrics] = useState<Metrics>({
    avgRevenue: 0,
    avgCustomers: 0,
    avgTransactions: 0,
    avgConversionRate: 0,
    avgPricePerMessage: 0,
  });
  const [platformMetrics, setPlatformMetrics] = useState<Metrics>({
    avgRevenue: 0,
    avgCustomers: 0,
    avgTransactions: 0,
    avgConversionRate: 0,
    avgPricePerMessage: 0,
  });
  const [radarData, setRadarData] = useState<any[]>([]);
  const [rankings, setRankings] = useState({
    revenue: 0,
    customers: 0,
    engagement: 0,
    overall: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchBenchmarks();
  }, [user]);

  const fetchBenchmarks = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch my metrics
      const { data: myTx, error: myError } = await supabase
        .from('transactions')
        .select('*')
        .eq('creator_id', user.id)
        .eq('status', 'completed');

      if (myError) throw myError;

      const myRevenue = myTx?.reduce((sum, t) => sum + t.net_amount, 0) || 0;
      const myCustomers = new Set(myTx?.map(t => t.customer_id)).size;
      const myTransactions = myTx?.length || 0;

      const { data: myViews } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact' })
        .eq('profile_id', user.id);

      const myConversionRate = (myViews?.length || 0) > 0 ? (myTransactions / (myViews?.length || 1)) * 100 : 0;

      const { data: mySettings } = await supabase
        .from('creator_settings')
        .select('price_per_message')
        .eq('user_id', user.id)
        .single();

      const myPricePerMessage = mySettings?.price_per_message || 5;

      setMyMetrics({
        avgRevenue: myRevenue,
        avgCustomers: myCustomers,
        avgTransactions: myTransactions,
        avgConversionRate: myConversionRate,
        avgPricePerMessage: myPricePerMessage,
      });

      // Fetch platform averages (all creators)
      const { data: allCreators, error: creatorsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'creator');

      if (creatorsError) throw creatorsError;

      const creatorIds = allCreators?.map(c => c.id) || [];
      
      // Calculate platform averages
      const { data: allTx } = await supabase
        .from('transactions')
        .select('creator_id, net_amount, customer_id')
        .in('creator_id', creatorIds)
        .eq('status', 'completed');

      const creatorStats = new Map<string, any>();
      allTx?.forEach((tx) => {
        if (!creatorStats.has(tx.creator_id)) {
          creatorStats.set(tx.creator_id, {
            revenue: 0,
            customers: new Set(),
            transactions: 0,
          });
        }
        const stats = creatorStats.get(tx.creator_id)!;
        stats.revenue += tx.net_amount;
        stats.customers.add(tx.customer_id);
        stats.transactions += 1;
      });

      const numCreators = creatorStats.size || 1;
      let totalRevenue = 0;
      let totalCustomers = 0;
      let totalTransactions = 0;

      creatorStats.forEach((stats) => {
        totalRevenue += stats.revenue;
        totalCustomers += stats.customers.size;
        totalTransactions += stats.transactions;
      });

      setPlatformMetrics({
        avgRevenue: totalRevenue / numCreators,
        avgCustomers: totalCustomers / numCreators,
        avgTransactions: totalTransactions / numCreators,
        avgConversionRate: 2.5, // Placeholder
        avgPricePerMessage: 5, // Placeholder
      });

      // Calculate percentile rankings
      const revenueRanking = Array.from(creatorStats.values())
        .filter(s => s.revenue <= myRevenue)
        .length / numCreators * 100;

      const customerRanking = Array.from(creatorStats.values())
        .filter(s => s.customers.size <= myCustomers)
        .length / numCreators * 100;

      const engagementRanking = Array.from(creatorStats.values())
        .filter(s => s.transactions <= myTransactions)
        .length / numCreators * 100;

      const overallRanking = (revenueRanking + customerRanking + engagementRanking) / 3;

      setRankings({
        revenue: revenueRanking,
        customers: customerRanking,
        engagement: engagementRanking,
        overall: overallRanking,
      });

      // Radar chart data
      setRadarData([
        {
          metric: 'Revenue',
          You: (myRevenue / platformMetrics.avgRevenue) * 100 || 0,
          Platform: 100,
        },
        {
          metric: 'Customers',
          You: (myCustomers / platformMetrics.avgCustomers) * 100 || 0,
          Platform: 100,
        },
        {
          metric: 'Engagement',
          You: (myTransactions / platformMetrics.avgTransactions) * 100 || 0,
          Platform: 100,
        },
        {
          metric: 'Conversion',
          You: (myConversionRate / platformMetrics.avgConversionRate) * 100 || 0,
          Platform: 100,
        },
        {
          metric: 'Pricing',
          You: (myPricePerMessage / platformMetrics.avgPricePerMessage) * 100 || 0,
          Platform: 100,
        },
      ]);

    } catch (error) {
      console.error('Error fetching benchmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankingBadge = (percentile: number) => {
    if (percentile >= 90) return <Badge className="bg-purple-500/10 text-purple-500">Top 10%</Badge>;
    if (percentile >= 75) return <Badge className="bg-primary/10 text-primary">Top 25%</Badge>;
    if (percentile >= 50) return <Badge className="bg-primary/10 text-primary">Above Average</Badge>;
    return <Badge className="bg-gray-500/10 text-gray-500">Below Average</Badge>;
  };

  if (loading || authLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Performance Benchmarking</h1>
          <p className="text-muted-foreground">See how you compare to other creators on the platform</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Overall Ranking"
            value={`${rankings.overall.toFixed(0)}%`}
            icon={Award}
            description="Percentile rank"
          />
          <StatsCard
            title="Revenue Rank"
            value={`${rankings.revenue.toFixed(0)}%`}
            icon={TrendingUp}
            description="vs other creators"
          />
          <StatsCard
            title="Customer Rank"
            value={`${rankings.customers.toFixed(0)}%`}
            icon={Users}
            description="audience size"
          />
          <StatsCard
            title="Engagement Rank"
            value={`${rankings.engagement.toFixed(0)}%`}
            icon={Target}
            description="activity level"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Performance Comparison</h2>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" stroke="hsl(var(--foreground))" />
                <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
                <Radar name="You" dataKey="You" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                <Radar name="Platform Avg" dataKey="Platform" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted))" fillOpacity={0.3} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-6">Your Rankings</h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Revenue Performance</span>
                  {getRankingBadge(rankings.revenue)}
                </div>
                <Progress value={rankings.revenue} className="h-3" />
                <p className="text-sm text-muted-foreground mt-1">
                  Better than {rankings.revenue.toFixed(0)}% of creators
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Customer Base</span>
                  {getRankingBadge(rankings.customers)}
                </div>
                <Progress value={rankings.customers} className="h-3" />
                <p className="text-sm text-muted-foreground mt-1">
                  Better than {rankings.customers.toFixed(0)}% of creators
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Engagement Level</span>
                  {getRankingBadge(rankings.engagement)}
                </div>
                <Progress value={rankings.engagement} className="h-3" />
                <p className="text-sm text-muted-foreground mt-1">
                  Better than {rankings.engagement.toFixed(0)}% of creators
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-6">Detailed Metrics Comparison</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-muted-foreground mb-3">Revenue</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">You:</span>
                  <span className="font-bold text-primary">${myMetrics.avgRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Platform Avg:</span>
                  <span className="font-medium">${platformMetrics.avgRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Difference:</span>
                  <span className={myMetrics.avgRevenue >= platformMetrics.avgRevenue ? 'text-green-500' : 'text-red-500'}>
                    {myMetrics.avgRevenue >= platformMetrics.avgRevenue ? '+' : ''}
                    {((myMetrics.avgRevenue - platformMetrics.avgRevenue) / platformMetrics.avgRevenue * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-muted-foreground mb-3">Customers</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">You:</span>
                  <span className="font-bold text-primary">{myMetrics.avgCustomers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Platform Avg:</span>
                  <span className="font-medium">{Math.round(platformMetrics.avgCustomers)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Difference:</span>
                  <span className={myMetrics.avgCustomers >= platformMetrics.avgCustomers ? 'text-green-500' : 'text-red-500'}>
                    {myMetrics.avgCustomers >= platformMetrics.avgCustomers ? '+' : ''}
                    {((myMetrics.avgCustomers - platformMetrics.avgCustomers) / platformMetrics.avgCustomers * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-muted-foreground mb-3">Transactions</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">You:</span>
                  <span className="font-bold text-primary">{myMetrics.avgTransactions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Platform Avg:</span>
                  <span className="font-medium">{Math.round(platformMetrics.avgTransactions)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Difference:</span>
                  <span className={myMetrics.avgTransactions >= platformMetrics.avgTransactions ? 'text-green-500' : 'text-red-500'}>
                    {myMetrics.avgTransactions >= platformMetrics.avgTransactions ? '+' : ''}
                    {((myMetrics.avgTransactions - platformMetrics.avgTransactions) / platformMetrics.avgTransactions * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
