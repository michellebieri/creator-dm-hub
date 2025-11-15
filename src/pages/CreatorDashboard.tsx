import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { PieChart, Users, ChevronLeft, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CreatorDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    newCustomers: 0,
    revenue: 0,
    revenuePerCustomer: 0,
    subscriptions: 0,
    messaging: 0,
    messageUnlockables: 0,
    posts: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      // Fetch conversations count
      const { count: customerCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id);

      // Fetch earnings
      const { data: transactions } = await supabase
        .from('transactions')
        .select('net_amount, transaction_type')
        .eq('creator_id', user.id)
        .eq('status', 'completed');

      const totalRevenue = transactions?.reduce((sum, t) => sum + t.net_amount, 0) || 0;
      const messagingRevenue = transactions?.filter(t => t.transaction_type === 'message').reduce((sum, t) => sum + t.net_amount, 0) || 0;
      const unlockablesRevenue = transactions?.filter(t => t.transaction_type === 'unlockable').reduce((sum, t) => sum + t.net_amount, 0) || 0;
      const packsRevenue = transactions?.filter(t => t.transaction_type === 'pack').reduce((sum, t) => sum + t.net_amount, 0) || 0;

      setStats({
        newCustomers: customerCount || 0,
        revenue: totalRevenue,
        revenuePerCustomer: customerCount ? totalRevenue / customerCount : 0,
        subscriptions: packsRevenue,
        messaging: messagingRevenue,
        messageUnlockables: unlockablesRevenue,
        posts: 0,
      });
    };

    fetchStats();
  }, [user]);

  if (loading) return null;

  const StatRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/50 via-background to-emerald-50/50 dark:from-green-950/20 dark:via-background dark:to-emerald-950/20">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 h-14 max-w-screen-lg mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4 space-y-4">
        <Card className="p-4 border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50 to-white dark:from-green-950/50 dark:to-background shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500">
                <PieChart className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-sm font-medium text-green-700 dark:text-green-400 uppercase">Summary</h2>
            </div>
            <Select defaultValue="today">
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="py-2">
              <div className="text-2xl font-bold mb-1">{stats.newCustomers}</div>
              <div className="text-sm text-muted-foreground">New customers</div>
            </div>
            
            <div className="py-2 border-t">
              <div className="text-2xl font-bold mb-1">${stats.revenue.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Revenue</div>
            </div>

            <div className="border-t pt-2">
              <StatRow label="Revenue per customer" value={`$${stats.revenuePerCustomer.toFixed(2)}`} />
              <StatRow label="Subscriptions" value={`$${stats.subscriptions.toFixed(2)}`} />
              <StatRow label="Messaging" value={`$${stats.messaging.toFixed(2)}`} />
              <StatRow label="Message unlockables" value={`$${stats.messageUnlockables.toFixed(2)}`} />
              <StatRow label="Posts" value={`$${stats.posts.toFixed(2)}`} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/50 dark:to-background shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-sm font-medium text-emerald-700 dark:text-emerald-400 uppercase">Revenue</h2>
            </div>
            <div className="flex gap-2">
              <Select defaultValue="total">
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="net">Net</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="4weeks">
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4weeks">Last 4 weeks</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-center py-12 text-muted-foreground">
            There's no data to display
          </div>
        </Card>

        <Card className="p-4 border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50 to-white dark:from-green-950/50 dark:to-background shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-sm font-medium text-green-700 dark:text-green-400 uppercase">New Customers</h2>
            </div>
            <Select defaultValue="4weeks">
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4weeks">Last 4 weeks</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-center py-12 text-muted-foreground">
            There's no data to display
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CreatorDashboard;
