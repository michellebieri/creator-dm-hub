import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Users, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

interface DailyStats {
  date: string;
  messages: number;
  revenue: number;
}

const AnalyticsDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalCustomers: 0,
    avgResponseTime: 0,
    conversionRate: 0,
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
        // Fetch total messages
        const { count: messageCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', user.id);

        // Fetch unique customers
        const { data: conversations } = await supabase
          .from('conversations')
          .select('customer_id')
          .eq('creator_id', user.id);

        const uniqueCustomers = new Set(conversations?.map(c => c.customer_id)).size;

        // Fetch daily stats for last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), 6 - i);
          return startOfDay(date).toISOString();
        });

        const dailyData: DailyStats[] = [];

        for (const date of last7Days) {
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);

          // Messages count
          const { count: msgCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', user.id)
            .gte('created_at', date)
            .lt('created_at', nextDay.toISOString());

          // Revenue for that day
          const { data: txData } = await supabase
            .from('transactions')
            .select('net_amount')
            .eq('creator_id', user.id)
            .eq('status', 'completed')
            .gte('created_at', date)
            .lt('created_at', nextDay.toISOString());

          const revenue = txData?.reduce((sum, t) => sum + t.net_amount, 0) || 0;

          dailyData.push({
            date: format(new Date(date), 'MMM dd'),
            messages: msgCount || 0,
            revenue,
          });
        }

        setStats({
          totalMessages: messageCount || 0,
          totalCustomers: uniqueCustomers,
          avgResponseTime: 0, // Placeholder
          conversionRate: 0, // Placeholder
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
  const maxMessages = Math.max(...dailyStats.map(d => d.messages), 1);

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Analytics</h1>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-medium text-muted-foreground">Total Messages</h3>
            </div>
            <p className="text-3xl font-bold">{stats.totalMessages}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-success" />
              <h3 className="text-sm font-medium text-muted-foreground">Total Customers</h3>
            </div>
            <p className="text-3xl font-bold">{stats.totalCustomers}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-5 w-5 text-accent" />
              <h3 className="text-sm font-medium text-muted-foreground">Avg. Transaction</h3>
            </div>
            <p className="text-3xl font-bold">
              ${stats.totalCustomers > 0 
                ? (dailyStats.reduce((sum, d) => sum + d.revenue, 0) / stats.totalCustomers).toFixed(2)
                : '0.00'}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-medium text-muted-foreground">Growth Rate</h3>
            </div>
            <p className="text-3xl font-bold">+12%</p>
          </Card>
        </div>

        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Last 7 Days Activity
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Messages</h3>
              <div className="space-y-2">
                {dailyStats.map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-muted-foreground">{day.date}</div>
                    <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-primary h-full flex items-center justify-end px-3 text-sm font-medium text-primary-foreground transition-all"
                        style={{ width: `${(day.messages / maxMessages) * 100}%` }}
                      >
                        {day.messages > 0 && day.messages}
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
                        className="bg-success h-full flex items-center justify-end px-3 text-sm font-medium text-white transition-all"
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
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-success mt-0.5" />
              <div>
                <p className="font-semibold">Strong Performance</p>
                <p className="text-sm text-muted-foreground">
                  Your message engagement is above average. Keep up the great work!
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <MessageCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold">Response Time</p>
                <p className="text-sm text-muted-foreground">
                  Consider responding faster to increase customer satisfaction.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
