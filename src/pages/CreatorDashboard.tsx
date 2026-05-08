import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { PieChart, Users, ChevronLeft, DollarSign, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

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
  const [timePeriod, setTimePeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('username').eq('id', user.id).single()
        .then(({ data }) => { if (data?.username) setUsername(data.username); });
    }
  }, [user]);

  const profileUrl = username ? `${window.location.origin}/${username}` : '';

  const handleCopy = () => {
    if (!profileUrl) return;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      // Calculate date filter based on time period
      let dateFilter: string | null = null;
      const now = new Date();
      
      switch (timePeriod) {
        case 'today':
          dateFilter = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          break;
        case 'week':
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateFilter = weekAgo.toISOString();
          break;
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFilter = monthStart.toISOString();
          break;
        case 'all':
          dateFilter = null;
          break;
      }

      // Build query for transactions
      let query = supabase
        .from('transactions')
        .select('net_amount, transaction_type, message_id, customer_id, amount')
        .eq('creator_id', user.id)
        .eq('status', 'completed');

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: transactions } = await query;

      // Count unique customers who spent at least $1.00
      const uniqueCustomers = new Set(
        transactions?.filter(t => t.amount >= 1.00).map(t => t.customer_id) || []
      );
      const customerCount = uniqueCustomers.size;

      // Calculate revenue by category
      const totalRevenue = transactions?.reduce((sum, t) => sum + t.net_amount, 0) || 0;
      
      const subscriptionsRevenue = transactions
        ?.filter(t => t.transaction_type === 'pack')
        .reduce((sum, t) => sum + t.net_amount, 0) || 0;
      
      const messagingRevenue = transactions
        ?.filter(t => t.transaction_type === 'message')
        .reduce((sum, t) => sum + t.net_amount, 0) || 0;
      
      const messageUnlockablesRevenue = transactions
        ?.filter(t => t.transaction_type === 'unlockable' && t.message_id !== null)
        .reduce((sum, t) => sum + t.net_amount, 0) || 0;
      
      const postsRevenue = transactions
        ?.filter(t => t.transaction_type === 'unlockable' && t.message_id === null)
        .reduce((sum, t) => sum + t.net_amount, 0) || 0;

      setStats({
        newCustomers: customerCount,
        revenue: totalRevenue,
        revenuePerCustomer: customerCount > 0 ? totalRevenue / customerCount : 0,
        subscriptions: subscriptionsRevenue,
        messaging: messagingRevenue,
        messageUnlockables: messageUnlockablesRevenue,
        posts: postsRevenue,
      });
    };

    fetchStats();
  }, [user, timePeriod]);

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
        {/* Profile Link Card */}
        <Card className="p-4 border-border">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Your profile link</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-mono truncate text-muted-foreground">
              {profileUrl || 'Loading...'}
            </div>
            <Button size="sm" variant="outline" onClick={handleCopy} disabled={!profileUrl}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
            {profileUrl && (
              <Button size="sm" variant="outline" onClick={() => window.open(profileUrl, '_blank')}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Share this link with your fans so they can message you</p>
        </Card>

        <Card className="p-4 border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50 to-white dark:from-green-950/50 dark:to-background shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500">
                <PieChart className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-sm font-medium text-green-700 dark:text-green-400 uppercase">Summary</h2>
            </div>
            <Select value={timePeriod} onValueChange={(value: any) => setTimePeriod(value)}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
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
