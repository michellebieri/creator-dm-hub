import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/StatsCard';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Users, ShoppingBag, ChevronLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function RevenueAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    avgTransaction: 0,
    totalTransactions: 0,
    activeCustomers: 0,
  });
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [typeBreakdown, setTypeBreakdown] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);

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

      // Fetch transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customer:profiles!transactions_customer_id_fkey(display_name, username)
        `)
        .eq('creator_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Calculate stats
      const totalRevenue = transactions?.reduce((sum, t) => sum + t.net_amount, 0) || 0;
      const totalTransactions = transactions?.length || 0;
      const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
      const uniqueCustomers = new Set(transactions?.map(t => t.customer_id)).size;

      setStats({
        totalRevenue,
        avgTransaction,
        totalTransactions,
        activeCustomers: uniqueCustomers,
      });

      // Time series data
      const dailyData = transactions?.reduce((acc: any, t) => {
        const date = new Date(t.created_at).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = { date, revenue: 0, count: 0 };
        }
        acc[date].revenue += t.net_amount;
        acc[date].count += 1;
        return acc;
      }, {});
      setTimeSeriesData(Object.values(dailyData || {}));

      // Type breakdown
      const typeData = transactions?.reduce((acc: any, t) => {
        const type = t.transaction_type;
        if (!acc[type]) {
          acc[type] = { name: type, value: 0 };
        }
        acc[type].value += t.net_amount;
        return acc;
      }, {});
      setTypeBreakdown(Object.values(typeData || {}));

      // Top customers
      const customerData = transactions?.reduce((acc: any, t) => {
        const customerId = t.customer_id;
        if (!acc[customerId]) {
          acc[customerId] = {
            name: t.customer?.display_name || t.customer?.username || 'Unknown',
            revenue: 0,
            transactions: 0,
          };
        }
        acc[customerId].revenue += t.net_amount;
        acc[customerId].transactions += 1;
        return acc;
      }, {});
      const topCustomersData = Object.values(customerData || {})
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10);
      setTopCustomers(topCustomersData as any[]);

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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-7xl mx-auto">
          <div className="w-10" />
          <h1 className="text-lg font-semibold">Revenue Analytics</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Revenue Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">Track your earnings and financial performance</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <StatsCard
              title="Total Revenue"
              value={`$${stats.totalRevenue.toFixed(2)}`}
              icon={DollarSign}
            />
          </Card>
          <Card>
            <StatsCard
              title="Avg Transaction"
              value={`$${stats.avgTransaction.toFixed(2)}`}
              icon={TrendingUp}
            />
          </Card>
          <Card>
            <StatsCard
              title="Transactions"
              value={stats.totalTransactions}
              icon={ShoppingBag}
            />
          </Card>
          <Card>
            <StatsCard
              title="Active Customers"
              value={stats.activeCustomers}
              icon={Users}
            />
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base font-semibold">Revenue Trend</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} name="Revenue ($)" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base font-semibold">Transaction Volume</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--secondary))" name="Transactions" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base font-semibold">Revenue by Type</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: $${entry.value.toFixed(2)}`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {typeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base font-semibold">Top Customers</h2>
            </div>
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.transactions} transactions</p>
                  </div>
                  <p className="font-bold text-primary">${customer.revenue.toFixed(2)}</p>
                </div>
              ))}
              {topCustomers.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No customer data yet</p>
              )}
            </div>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
