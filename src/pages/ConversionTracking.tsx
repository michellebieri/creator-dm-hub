import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/StatsCard';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts';
import { Eye, Unlock, ShoppingCart, TrendingUp } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function ConversionTracking() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [stats, setStats] = useState({
    totalViews: 0,
    totalUnlocks: 0,
    totalPurchases: 0,
    conversionRate: 0,
  });
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [contentPerformance, setContentPerformance] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchAnalytics();
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const daysAgo = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch profile views
      const { data: views, error: viewsError } = await supabase
        .from('profile_views')
        .select('*')
        .eq('profile_id', user.id)
        .gte('created_at', startDate.toISOString());

      if (viewsError) throw viewsError;
      const totalViews = views?.length || 0;

      // Fetch unlockable transactions
      const { data: unlockTx, error: unlockError } = await supabase
        .from('transactions')
        .select('*')
        .eq('creator_id', user.id)
        .eq('transaction_type', 'unlockable')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());

      if (unlockError) throw unlockError;
      const totalUnlocks = unlockTx?.length || 0;

      // Fetch all completed transactions
      const { data: allTx, error: allTxError } = await supabase
        .from('transactions')
        .select('*')
        .eq('creator_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (allTxError) throw allTxError;
      const totalPurchases = allTx?.length || 0;

      // Calculate conversion rate
      const conversionRate = totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0;

      setStats({
        totalViews,
        totalUnlocks,
        totalPurchases,
        conversionRate,
      });

      // Funnel data
      const viewToUnlock = totalViews > 0 ? (totalUnlocks / totalViews) * 100 : 0;
      const unlockToPurchase = totalUnlocks > 0 ? (totalPurchases / totalUnlocks) * 100 : 0;

      setFunnelData([
        { stage: 'Profile Views', value: totalViews, fill: 'hsl(var(--primary))' },
        { stage: 'Content Unlocks', value: totalUnlocks, fill: 'hsl(var(--secondary))' },
        { stage: 'Purchases', value: totalPurchases, fill: 'hsl(var(--accent))' },
      ]);

      // Daily trend data
      const dailyData: Record<string, any> = {};
      views?.forEach((view) => {
        const date = new Date(view.created_at).toLocaleDateString();
        if (!dailyData[date]) {
          dailyData[date] = { date, views: 0, unlocks: 0, purchases: 0 };
        }
        dailyData[date].views += 1;
      });

      unlockTx?.forEach((tx) => {
        const date = new Date(tx.created_at).toLocaleDateString();
        if (dailyData[date]) {
          dailyData[date].unlocks += 1;
        }
      });

      allTx?.forEach((tx) => {
        const date = new Date(tx.created_at).toLocaleDateString();
        if (dailyData[date]) {
          dailyData[date].purchases += 1;
        }
      });

      setTrendData(Object.values(dailyData));

      // Content performance
      const contentMap = new Map<string, any>();
      
      const { data: unlockables, error: unlockablesError } = await supabase
        .from('unlockables')
        .select('id, price, media_type')
        .eq('creator_id', user.id);

      if (unlockablesError) throw unlockablesError;

      unlockables?.forEach((unlockable) => {
        const unlockCount = unlockTx?.filter(tx => 
          allTx?.find(t => t.id === tx.id)
        ).length || 0;

        contentMap.set(unlockable.id, {
          type: unlockable.media_type,
          price: unlockable.price,
          unlocks: unlockCount,
          revenue: unlockCount * unlockable.price,
        });
      });

      // Aggregate by type
      const typePerformance = new Map<string, any>();
      contentMap.forEach((data, id) => {
        const type = data.type;
        if (!typePerformance.has(type)) {
          typePerformance.set(type, {
            type,
            totalUnlocks: 0,
            totalRevenue: 0,
            avgPrice: 0,
          });
        }
        const typeData = typePerformance.get(type)!;
        typeData.totalUnlocks += data.unlocks;
        typeData.totalRevenue += data.revenue;
      });

      setContentPerformance(Array.from(typePerformance.values()));

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Conversion Tracking</h1>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Profile Views"
            value={stats.totalViews}
            icon={Eye}
          />
          <StatsCard
            title="Content Unlocks"
            value={stats.totalUnlocks}
            icon={Unlock}
          />
          <StatsCard
            title="Total Purchases"
            value={stats.totalPurchases}
            icon={ShoppingCart}
          />
          <StatsCard
            title="Conversion Rate"
            value={`${stats.conversionRate.toFixed(2)}%`}
            icon={TrendingUp}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Conversion Funnel</h2>
            <div className="space-y-4">
              {funnelData.map((stage, index) => (
                <div key={stage.stage}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{stage.stage}</span>
                    <span className="text-2xl font-bold">{stage.value}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-8 relative overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(stage.value / funnelData[0].value) * 100}%`,
                        backgroundColor: stage.fill,
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                      {((stage.value / funnelData[0].value) * 100).toFixed(1)}%
                    </span>
                  </div>
                  {index < funnelData.length - 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {((funnelData[index + 1].value / stage.value) * 100).toFixed(1)}% converted to next stage
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Content Performance by Type</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={contentPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="type" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="totalUnlocks" fill="hsl(var(--primary))" name="Unlocks" />
                <Bar dataKey="totalRevenue" fill="hsl(var(--secondary))" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Conversion Trend</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
              <YAxis stroke="hsl(var(--foreground))" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Legend />
              <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} name="Views" />
              <Line type="monotone" dataKey="unlocks" stroke="hsl(var(--secondary))" strokeWidth={2} name="Unlocks" />
              <Line type="monotone" dataKey="purchases" stroke="hsl(var(--accent))" strokeWidth={2} name="Purchases" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
