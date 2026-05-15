import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { PieChart, Users, ChevronLeft, DollarSign, Copy, Check, ExternalLink, Crown, Wallet, Settings as SettingsIcon, AlertCircle } from 'lucide-react';
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
  const [hasTiers, setHasTiers] = useState<boolean | null>(null);
  const [activeSubscribers, setActiveSubscribers] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('username').eq('id', user.id).single()
      .then(({ data }) => { if (data?.username) setUsername(data.username); });

    supabase
      .from('subscription_tiers')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', user.id)
      .eq('is_active', true)
      .then(({ count }) => setHasTiers((count ?? 0) > 0));

    supabase
      .from('creator_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', user.id)
      .in('status', ['active', 'canceling'])
      .then(({ count }) => setActiveSubscribers(count ?? 0));
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
        ?.filter(t => t.transaction_type === 'subscription')
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-screen-lg mx-auto">
          <div className="w-10" />
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
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
            {profileUrl && (
              <Button size="sm" variant="outline" onClick={() => window.open(profileUrl, '_blank')}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Share this link with your fans so they can message you</p>
        </Card>

        {/* Empty-state nudge: prompt creators with no subscription tiers */}
        {hasTiers === false && (
          <Card className="p-4 border-primary/40 bg-primary/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Set up subscription tiers to unlock recurring revenue</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Fans can subscribe monthly for free messages or exclusive perks. Without tiers, the Subscribe button is hidden on your profile.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/settings/subscription')}
                >
                  <Crown className="h-4 w-4 mr-1.5" />
                  Create your first tier
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/subscribers')}>
            <Users className="h-4 w-4" />
            <span className="text-xs">Subscribers ({activeSubscribers})</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/settings/subscription')}>
            <Crown className="h-4 w-4" />
            <span className="text-xs">Subscription tiers</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/earnings')}>
            <Wallet className="h-4 w-4" />
            <span className="text-xs">Earnings</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/settings/messaging')}>
            <SettingsIcon className="h-4 w-4" />
            <span className="text-xs">Messaging settings</span>
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <PieChart className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Summary</h2>
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

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Revenue</h2>
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

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">New Customers</h2>
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
