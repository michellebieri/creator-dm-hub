import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, DollarSign, TrendingUp, Calendar, ChevronLeft } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

interface DailyStats {
  date: string;
  customers: number;
  revenue: number;
}

const AnalyticsDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalRevenue: 0,
    arpu: 0,
    customerGrowthRate: 0,
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      try {
        // Fetch all completed transactions for this creator
        const { data: allTransactions } = await supabase
          .from('transactions')
          .select('customer_id, amount, created_at')
          .eq('creator_id', user.id)
          .eq('status', 'completed')
          .gt('amount', 0);

        // Calculate unique customers (only those who made a financial transaction)
        const uniqueCustomerIds = new Set(allTransactions?.map(t => t.customer_id) || []);
        const totalCustomers = uniqueCustomerIds.size;

        // Calculate total revenue
        const totalRevenue = allTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

        // Calculate ARPU (Average Revenue Per User)
        const arpu = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

        // Calculate customer growth rate (last 30 days vs previous 30 days)
        const thirtyDaysAgo = subDays(new Date(), 30);
        const sixtyDaysAgo = subDays(new Date(), 60);

        const { data: recentCustomerTxns } = await supabase
          .from('transactions')
          .select('customer_id')
          .eq('creator_id', user.id)
          .eq('status', 'completed')
          .gt('amount', 0)
          .gte('created_at', thirtyDaysAgo.toISOString());

        const { data: previousCustomerTxns } = await supabase
          .from('transactions')
          .select('customer_id')
          .eq('creator_id', user.id)
          .eq('status', 'completed')
          .gt('amount', 0)
          .gte('created_at', sixtyDaysAgo.toISOString())
          .lt('created_at', thirtyDaysAgo.toISOString());

        const recentCustomerCount = new Set(recentCustomerTxns?.map(t => t.customer_id) || []).size;
        const previousCustomerCount = new Set(previousCustomerTxns?.map(t => t.customer_id) || []).size;

        const customerGrowthRate = previousCustomerCount > 0 
          ? ((recentCustomerCount - previousCustomerCount) / previousCustomerCount) * 100 
          : 0;

        // Fetch daily stats for last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), 6 - i);
          return startOfDay(date).toISOString();
        });

        const dailyData: DailyStats[] = [];

        for (const date of last7Days) {
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);

          // Get transactions for this day
          const { data: dayTxns } = await supabase
            .from('transactions')
            .select('customer_id, amount')
            .eq('creator_id', user.id)
            .eq('status', 'completed')
            .gt('amount', 0)
            .gte('created_at', date)
            .lt('created_at', nextDay.toISOString());

          const dailyCustomers = new Set(dayTxns?.map(t => t.customer_id) || []).size;
          const dailyRevenue = dayTxns?.reduce((sum, t) => sum + t.amount, 0) || 0;

          dailyData.push({
            date: format(new Date(date), 'MMM dd'),
            customers: dailyCustomers,
            revenue: dailyRevenue,
          });
        }

        setStats({
          totalCustomers,
          totalRevenue,
          arpu,
          customerGrowthRate,
        });

        setDailyStats(dailyData);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  if (loading || authLoading) {
    return null;
  }

  const maxRevenue = Math.max(...dailyStats.map(d => d.revenue), 1);
  const maxCustomers = Math.max(...dailyStats.map(d => d.customers), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/50 via-background to-emerald-50/50 dark:from-green-950/20 dark:via-background dark:to-emerald-950/20">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 h-14 max-w-6xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Analytics</h1>
          <div className="w-10" />
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto p-8">
        {/* Colorful Header */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
          <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-green-50">Monitor your performance and revenue metrics</p>
        </div>

        {/* Stats Cards with Colors */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/50 dark:to-background shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Total Customers</h3>
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalCustomers}</p>
            <p className="text-xs text-muted-foreground mt-1">Users with completed purchases</p>
          </Card>

          <Card className="p-6 border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50 to-white dark:from-green-950/50 dark:to-background shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-500">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Avg Revenue Per User</h3>
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              ${stats.arpu.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total revenue / customers</p>
          </Card>

          <Card className="p-6 border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/50 dark:to-background shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Customer Growth Rate</h3>
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.totalCustomers > 0 ? `${stats.customerGrowthRate.toFixed(1)}%` : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days vs previous</p>
          </Card>
        </div>

        <Card className="p-6 mb-8 border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50 to-white dark:from-green-950/50 dark:to-background shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Last 7 Days Activity</h2>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">New Customers</h3>
              <div className="space-y-2">
                {dailyStats.map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-muted-foreground">{day.date}</div>
                    <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-green-500 h-full flex items-center justify-end px-3 text-sm font-medium text-white transition-all"
                        style={{ width: `${(day.customers / maxCustomers) * 100}%` }}
                      >
                        {day.customers > 0 && day.customers}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Revenue</h3>
              <div className="space-y-2">
                {dailyStats.map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-muted-foreground">{day.date}</div>
                    <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-full flex items-center justify-end px-3 text-sm font-medium text-white transition-all"
                        style={{ width: `${(day.revenue / maxRevenue) * 100}%` }}
                      >
                        {day.revenue > 0 && `$${day.revenue.toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Performance Insights</h2>
          <div className="space-y-4">
            {stats.totalCustomers === 0 ? (
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">Getting Started</p>
                  <p className="text-sm text-muted-foreground">
                    Your analytics will update once customers make their first purchase.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <p className="font-semibold">Revenue Tracking</p>
                    <p className="text-sm text-muted-foreground">
                      Total revenue: ${stats.totalRevenue.toFixed(2)} from {stats.totalCustomers} paying customer{stats.totalCustomers !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">Customer Value</p>
                    <p className="text-sm text-muted-foreground">
                      Your average customer spends ${stats.arpu.toFixed(2)} - focus on retention to maximize lifetime value
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;