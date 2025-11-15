import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/StatsCard';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Globe, TrendingUp, Users, Link as LinkIcon } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(220, 70%, 50%)',
  'hsl(280, 70%, 50%)',
  'hsl(340, 70%, 50%)',
];

export default function TrafficSourceDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [stats, setStats] = useState({
    totalVisits: 0,
    uniqueVisitors: 0,
    topSource: 'Direct',
    avgSessionDuration: 0,
  });
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [mediumData, setMediumData] = useState<any[]>([]);
  const [campaignData, setCampaignData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [topReferrers, setTopReferrers] = useState<any[]>([]);

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

      // Fetch traffic sources
      const { data: traffic, error } = await supabase
        .from('traffic_sources')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const totalVisits = traffic?.length || 0;
      const uniqueVisitors = new Set(traffic?.map(t => t.user_id)).size;

      // Aggregate by source
      const sourceMap = new Map<string, number>();
      const mediumMap = new Map<string, number>();
      const campaignMap = new Map<string, number>();
      const referrerMap = new Map<string, number>();

      traffic?.forEach((t) => {
        const source = t.source || 'Direct';
        const medium = t.medium || 'None';
        const campaign = t.campaign || 'None';
        const referrer = t.referrer || 'Direct';

        sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
        mediumMap.set(medium, (mediumMap.get(medium) || 0) + 1);
        campaignMap.set(campaign, (campaignMap.get(campaign) || 0) + 1);
        referrerMap.set(referrer, (referrerMap.get(referrer) || 0) + 1);
      });

      // Find top source
      let topSource = 'Direct';
      let maxCount = 0;
      sourceMap.forEach((count, source) => {
        if (count > maxCount) {
          maxCount = count;
          topSource = source;
        }
      });

      setStats({
        totalVisits,
        uniqueVisitors,
        topSource,
        avgSessionDuration: 0, // Would need session tracking
      });

      // Convert to chart data
      setSourceData(
        Array.from(sourceMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );

      setMediumData(
        Array.from(mediumMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );

      setCampaignData(
        Array.from(campaignMap.entries())
          .filter(([name]) => name !== 'None')
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)
      );

      setTopReferrers(
        Array.from(referrerMap.entries())
          .map(([url, visits]) => ({ url, visits }))
          .sort((a, b) => b.visits - a.visits)
          .slice(0, 10)
      );

      // Daily trend
      const dailyData: Record<string, any> = {};
      traffic?.forEach((t) => {
        const date = new Date(t.created_at).toLocaleDateString();
        if (!dailyData[date]) {
          dailyData[date] = { date, visits: 0 };
        }
        dailyData[date].visits += 1;
      });

      setTrendData(Object.values(dailyData));

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
          <div>
            <h1 className="text-4xl font-bold">Traffic Sources</h1>
            <p className="text-muted-foreground mt-2">Understand where your visitors are coming from</p>
          </div>
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
            title="Total Visits"
            value={stats.totalVisits}
            icon={Globe}
          />
          <StatsCard
            title="Unique Visitors"
            value={stats.uniqueVisitors}
            icon={Users}
          />
          <StatsCard
            title="Top Source"
            value={stats.topSource}
            icon={TrendingUp}
          />
          <StatsCard
            title="Top Referrers"
            value={topReferrers.length}
            icon={LinkIcon}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Traffic by Source</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Traffic by Medium</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mediumData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="value" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card className="p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Traffic Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
              <YAxis stroke="hsl(var(--foreground))" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Line type="monotone" dataKey="visits" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Top Campaigns</h2>
            {campaignData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No campaign data yet</p>
            ) : (
              <div className="space-y-3">
                {campaignData.map((campaign, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge>{index + 1}</Badge>
                      <span className="font-medium">{campaign.name}</span>
                    </div>
                    <span className="text-primary font-bold">{campaign.value} visits</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Top Referrers</h2>
            {topReferrers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No referrer data yet</p>
            ) : (
              <div className="space-y-3">
                {topReferrers.map((referrer, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge>{index + 1}</Badge>
                      <span className="font-medium truncate">{referrer.url}</span>
                    </div>
                    <span className="text-primary font-bold ml-3">{referrer.visits}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
