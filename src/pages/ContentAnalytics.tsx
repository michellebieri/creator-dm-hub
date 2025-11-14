import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Unlock, Package, Image, Video, FileText, Music } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { format, subDays, startOfDay } from 'date-fns';

interface ContentStats {
  totalItems: number;
  totalUnlocks: number;
  totalRevenue: number;
  bundleRevenue: number;
  individualRevenue: number;
}

interface ContentItem {
  id: string;
  media_type: string;
  price: number;
  created_at: string;
  unlocked_by: string[];
  message_id: string;
}

interface TimeSeriesData {
  date: string;
  unlocks: number;
  revenue: number;
}

const ContentAnalytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ContentStats>({
    totalItems: 0,
    totalUnlocks: 0,
    totalRevenue: 0,
    bundleRevenue: 0,
    individualRevenue: 0,
  });
  const [content, setContent] = useState<ContentItem[]>([]);
  const [timeRange, setTimeRange] = useState('7');
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      // Fetch content items
      const { data: contentData, error: contentError } = await supabase
        .from('unlockables')
        .select('*')
        .eq('creator_id', user.id);

      if (contentError) throw contentError;

      setContent(contentData || []);

      // Calculate stats
      const totalItems = contentData?.length || 0;
      const totalUnlocks = contentData?.reduce((sum, item) => sum + (item.unlocked_by?.length || 0), 0) || 0;

      // Fetch revenue from transactions
      const { data: transactionData, error: transError } = await supabase
        .from('transactions')
        .select('net_amount, transaction_type, created_at')
        .eq('creator_id', user.id)
        .eq('status', 'completed');

      if (transError) throw transError;

      const totalRevenue = transactionData?.reduce((sum, t) => sum + Number(t.net_amount), 0) || 0;
      const bundleRevenue = transactionData
        ?.filter(t => t.transaction_type === 'unlockable')
        .reduce((sum, t) => sum + Number(t.net_amount), 0) || 0;
      const individualRevenue = totalRevenue - bundleRevenue;

      setStats({
        totalItems,
        totalUnlocks,
        totalRevenue,
        bundleRevenue,
        individualRevenue,
      });

      // Generate time series data
      const days = parseInt(timeRange);
      const dateRange = Array.from({ length: days }, (_, i) => {
        const date = startOfDay(subDays(new Date(), days - 1 - i));
        return format(date, 'yyyy-MM-dd');
      });

      const timeSeries = dateRange.map(date => {
        const dayTransactions = transactionData?.filter(t => 
          format(new Date(t.created_at), 'yyyy-MM-dd') === date
        ) || [];

        return {
          date: format(new Date(date), 'MMM dd'),
          unlocks: dayTransactions.length,
          revenue: dayTransactions.reduce((sum, t) => sum + Number(t.net_amount), 0),
        };
      });

      setTimeSeriesData(timeSeries);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContentTypeStats = () => {
    const typeMap: Record<string, number> = {};
    content.forEach(item => {
      typeMap[item.media_type] = (typeMap[item.media_type] || 0) + 1;
    });

    return Object.entries(typeMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  };

  const getTopContent = () => {
    return content
      .map(item => ({
        ...item,
        unlockCount: item.unlocked_by?.length || 0,
        revenue: (item.unlocked_by?.length || 0) * Number(item.price),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Analytics</h1>
          <p className="text-muted-foreground">Track your content performance</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">Items in vault</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Unlocks</CardTitle>
            <Unlock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUnlocks}</div>
            <p className="text-xs text-muted-foreground">Content unlocked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From all content</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. per Item</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalItems > 0 ? (stats.totalRevenue / stats.totalItems).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Revenue per content</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="top">Top Content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Over Time</CardTitle>
                <CardDescription>Daily revenue from content unlocks</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Revenue ($)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Unlocks Over Time</CardTitle>
                <CardDescription>Daily content unlock activity</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="unlocks" fill="hsl(var(--secondary))" name="Unlocks" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Content by Type</CardTitle>
                <CardDescription>Distribution of content types</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getContentTypeStats()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {getContentTypeStats().map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Sources</CardTitle>
                <CardDescription>Bundle vs individual sales</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Bundles', value: stats.bundleRevenue },
                        { name: 'Individual', value: stats.individualRevenue },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--secondary))" />
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="top" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Content</CardTitle>
              <CardDescription>Your highest revenue content items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getTopContent().map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="h-8 w-8 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      {getMediaIcon(item.media_type)}
                      <div>
                        <p className="font-medium capitalize">{item.media_type} Content</p>
                        <p className="text-sm text-muted-foreground">
                          {item.unlockCount} {item.unlockCount === 1 ? 'unlock' : 'unlocks'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${item.revenue.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">${item.price} each</p>
                    </div>
                  </div>
                ))}
                {getTopContent().length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No content unlocked yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentAnalytics;
