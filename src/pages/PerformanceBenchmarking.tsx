import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/StatsCard';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';
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
      // ── My metrics (own transactions — RLS allows this) ──────────────────
      const { data: myTx, error: myError } = await supabase
        .from('transactions')
        .select('net_amount, customer_id')
        .eq('creator_id', user.id)
        .eq('status', 'completed');

      if (myError) throw myError;

      const myRevenue = myTx?.reduce((sum, t) => sum + Number(t.net_amount), 0) || 0;
      const myCustomers = new Set(myTx?.map(t => t.customer_id)).size;
      const myTransactions = myTx?.length || 0;

      const { data: myViews } = await supabase
        .from('profile_views')
        .select('id', { count: 'exact' })
        .eq('profile_id', user.id);

      const myConversionRate =
        (myViews?.length || 0) > 0
          ? (myTransactions / (myViews?.length || 1)) * 100
          : 0;

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

      // ── Platform-wide stats via SECURITY DEFINER RPC ─────────────────────
      // Bypasses RLS so we get real aggregates across all creators.
      const { data: benchmarkRows, error: benchmarkError } = await supabase
        .rpc('get_platform_benchmark_stats');

      if (benchmarkError) throw benchmarkError;

      const allStats = (benchmarkRows || []) as Array<{
        creator_id: string;
        total_revenue: number;
        unique_customers: number;
        total_transactions: number;
      }>;

      const numCreators = allStats.length || 1;
      const totalRevenue = allStats.reduce((s, r) => s + Number(r.total_revenue), 0);
      const totalCustomers = allStats.reduce((s, r) => s + Number(r.unique_customers), 0);
      const totalTransactions = allStats.reduce((s, r) => s + Number(r.total_transactions), 0);

      // Use local variable to avoid stale-closure issues in setRadarData below
      const computedPlatformMetrics: Metrics = {
        avgRevenue: totalRevenue / numCreators,
        avgCustomers: totalCustomers / numCreators,
        avgTransactions: totalTransactions / numCreators,
        avgConversionRate: 2.5,
        avgPricePerMessage: 5,
      };

      setPlatformMetrics(computedPlatformMetrics);

      // ── Percentile rankings ───────────────────────────────────────────────
      const revenueRanking =
        allStats.filter(s => Number(s.total_revenue) <= myRevenue).length / numCreators * 100;
      const customerRanking =
        allStats.filter(s => Number(s.unique_customers) <= myCustomers).length / numCreators * 100;
      const engagementRanking =
        allStats.filter(s => Number(s.total_transactions) <= myTransactions).length / numCreators * 100;
      const overallRanking = (revenueRanking + customerRanking + engagementRanking) / 3;

      setRankings({ revenue: revenueRanking, customers: customerRanking, engagement: engagementRanking, overall: overallRanking });

      // ── Radar chart — use computedPlatformMetrics, NOT state (no stale closure) ──
      const safe = (n: number, d: number) => d > 0 ? Math.min((n / d) * 100, 300) : 0;

      setRadarData([
        { metric: 'Revenue',    You: safe(myRevenue,          computedPlatformMetrics.avgRevenue),         Platform: 100 },
        { metric: 'Customers',  You: safe(myCustomers,        computedPlatformMetrics.avgCustomers),       Platform: 100 },
        { metric: 'Engagement', You: safe(myTransactions,     computedPlatformMetrics.avgTransactions),    Platform: 100 },
        { metric: 'Conversion', You: safe(myConversionRate,   computedPlatformMetrics.avgConversionRate),  Platform: 100 },
        { metric: 'Pricing',    You: safe(myPricePerMessage,  computedPlatformMetrics.avgPricePerMessage), Platform: 100 },
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

  const pctDiff = (mine: number, avg: number) => {
    if (avg === 0) return '0.0';
    return ((mine - avg) / avg * 100).toFixed(1);
  };

  if (loading || authLoading) return <LoadingSpinner />;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Performance Benchmarking</h1>
          <p className="text-muted-foreground">See how you compare to other creators on the platform</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatsCard title="Overall Ranking" value={`${rankings.overall.toFixed(0)}%`} icon={Award} description="Percentile rank" />
          <StatsCard title="Revenue Rank" value={`${rankings.revenue.toFixed(0)}%`} icon={TrendingUp} description="vs other creators" />
          <StatsCard title="Customer Rank" value={`${rankings.customers.toFixed(0)}%`} icon={Users} description="audience size" />
          <StatsCard title="Engagement Rank" value={`${rankings.engagement.toFixed(0)}%`} icon={Target} description="activity level" />
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
              {[
                { label: 'Revenue Performance', val: rankings.revenue },
                { label: 'Customer Base', val: rankings.customers },
                { label: 'Engagement Level', val: rankings.engagement },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{label}</span>
                    {getRankingBadge(val)}
                  </div>
                  <Progress value={val} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-1">Better than {val.toFixed(0)}% of creators</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-6">Detailed Metrics Comparison</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: 'Revenue', mine: myMetrics.avgRevenue, avg: platformMetrics.avgRevenue, fmt: (v: number) => `$${v.toFixed(2)}` },
              { label: 'Customers', mine: myMetrics.avgCustomers, avg: platformMetrics.avgCustomers, fmt: (v: number) => `${Math.round(v)}` },
              { label: 'Transactions', mine: myMetrics.avgTransactions, avg: platformMetrics.avgTransactions, fmt: (v: number) => `${Math.round(v)}` },
            ].map(({ label, mine, avg, fmt }) => (
              <div key={label} className="p-4 border rounded-lg">
                <h3 className="font-medium text-muted-foreground mb-3">{label}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">You:</span>
                    <span className="font-bold text-primary">{fmt(mine)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Platform Avg:</span>
                    <span className="font-medium">{fmt(avg)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Difference:</span>
                    <span className={mine >= avg ? 'text-primary' : 'text-destructive'}>
                      {mine >= avg ? '+' : ''}{pctDiff(mine, avg)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
