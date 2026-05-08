import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, DollarSign, TrendingUp, MessageCircle, ChevronLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, subDays, startOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface DailyStats {
  date: string;
  revenue: number;
  customers: number;
}

interface RevenueByType {
  type: string;
  amount: number;
  count: number;
}

const TYPE_LABELS: Record<string, string> = {
  message: 'Messages',
  pack: 'Message Packs',
  unlockable: 'Unlockables',
};

const TYPE_COLORS: Record<string, string> = {
  message: 'bg-primary',
  pack: 'bg-primary/70',
  unlockable: 'bg-primary/40',
};

const AnalyticsDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<7 | 30>(30);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
    totalCustomers: 0,
    arpu: 0,
    newCustomersThisMonth: 0,
    newCustomersLastMonth: 0,
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [revenueByType, setRevenueByType] = useState<RevenueByType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchAnalytics();
  }, [user, range]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const { data: allTxns } = await supabase
        .from('transactions')
        .select('customer_id, amount, created_at, transaction_type')
        .eq('creator_id', user!.id)
        .eq('status', 'completed')
        .gt('amount', 0);

      const txns = allTxns || [];

      const totalRevenue = txns.reduce((s, t) => s + t.amount, 0);
      const uniqueCustomers = new Set(txns.map(t => t.customer_id));
      const totalCustomers = uniqueCustomers.size;
      const arpu = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

      const now = new Date();
      const thisMonthStart = startOfMonth(now).toISOString();
      const thisMonthEnd = endOfMonth(now).toISOString();
      const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
      const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();

      const thisMonthRevenue = txns
        .filter(t => t.created_at >= thisMonthStart && t.created_at <= thisMonthEnd)
        .reduce((s, t) => s + t.amount, 0);

      const lastMonthRevenue = txns
        .filter(t => t.created_at >= lastMonthStart && t.created_at <= lastMonthEnd)
        .reduce((s, t) => s + t.amount, 0);

      const newCustomersThisMonth = new Set(
        txns.filter(t => t.created_at >= thisMonthStart && t.created_at <= thisMonthEnd)
          .map(t => t.customer_id)
      ).size;

      const newCustomersLastMonth = new Set(
        txns.filter(t => t.created_at >= lastMonthStart && t.created_at <= lastMonthEnd)
          .map(t => t.customer_id)
      ).size;

      // Revenue by type
      const typeMap: Record<string, { amount: number; count: number }> = {};
      txns.forEach(t => {
        const key = t.transaction_type || 'message';
        if (!typeMap[key]) typeMap[key] = { amount: 0, count: 0 };
        typeMap[key].amount += t.amount;
        typeMap[key].count += 1;
      });
      const revenueByTypeArr: RevenueByType[] = Object.entries(typeMap)
        .map(([type, v]) => ({ type, ...v }))
        .sort((a, b) => b.amount - a.amount);

      // Daily stats for selected range
      const days = Array.from({ length: range }, (_, i) => {
        const d = subDays(now, range - 1 - i);
        return startOfDay(d).toISOString();
      });

      const daily: DailyStats[] = days.map(dateStr => {
        const nextDay = new Date(dateStr);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextStr = nextDay.toISOString();
        const dayTxns = txns.filter(t => t.created_at >= dateStr && t.created_at < nextStr);
        return {
          date: range === 7
            ? format(new Date(dateStr), 'EEE')
            : format(new Date(dateStr), 'MMM d'),
          revenue: dayTxns.reduce((s, t) => s + t.amount, 0),
          customers: new Set(dayTxns.map(t => t.customer_id)).size,
        };
      });

      setStats({ totalRevenue, thisMonthRevenue, lastMonthRevenue, totalCustomers, arpu, newCustomersThisMonth, newCustomersLastMonth });
      setDailyStats(daily);
      setRevenueByType(revenueByTypeArr);
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const revenueMoM = stats.lastMonthRevenue > 0
    ? ((stats.thisMonthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100
    : null;

  const customerMoM = stats.newCustomersLastMonth > 0
    ? ((stats.newCustomersThisMonth - stats.newCustomersLastMonth) / stats.newCustomersLastMonth) * 100
    : null;

  const maxRevenue = Math.max(...dailyStats.map(d => d.revenue), 1);
  const totalTypeRevenue = revenueByType.reduce((s, t) => s + t.amount, 0);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold">Analytics</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 col-span-2 rounded-2xl border-border">
            <p className="text-xs text-muted-foreground mb-1">Total Revenue (all time)</p>
            <p className="text-3xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-muted-foreground">
                This month: <span className="font-semibold text-foreground">${stats.thisMonthRevenue.toFixed(2)}</span>
              </span>
              {revenueMoM !== null && (
                <span className={`flex items-center gap-0.5 text-xs font-medium ${revenueMoM >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {revenueMoM >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(revenueMoM).toFixed(1)}% vs last month
                </span>
              )}
            </div>
          </Card>

          <Card className="p-4 rounded-2xl border-border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Paying Fans</p>
            </div>
            <p className="text-2xl font-bold">{stats.totalCustomers}</p>
            {customerMoM !== null && (
              <span className={`flex items-center gap-0.5 text-xs font-medium mt-1 ${customerMoM >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {customerMoM >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(customerMoM).toFixed(0)}% this month
              </span>
            )}
          </Card>

          <Card className="p-4 rounded-2xl border-border">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Avg per Fan</p>
            </div>
            <p className="text-2xl font-bold">${stats.arpu.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">lifetime ARPU</p>
          </Card>
        </div>

        {/* Revenue by type */}
        {revenueByType.length > 0 && (
          <Card className="p-4 rounded-2xl border-border">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Revenue by Type</h2>
            </div>
            <div className="space-y-3">
              {revenueByType.map(item => (
                <div key={item.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{TYPE_LABELS[item.type] ?? item.type}</span>
                    <span className="text-sm font-medium">${item.amount.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${TYPE_COLORS[item.type] ?? 'bg-primary'}`}
                      style={{ width: `${totalTypeRevenue > 0 ? (item.amount / totalTypeRevenue) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.count} transaction{item.count !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Daily revenue chart */}
        <Card className="p-4 rounded-2xl border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Revenue</h2>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              {([7, 30] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    range === r ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  {r}d
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end gap-1 h-32">
            {dailyStats.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full flex items-end justify-center" style={{ height: '100px' }}>
                  <div
                    className="w-full bg-primary/20 rounded-t-sm group-hover:bg-primary/40 transition-colors relative"
                    style={{ height: `${Math.max((day.revenue / maxRevenue) * 100, day.revenue > 0 ? 4 : 0)}%` }}
                  >
                    {day.revenue > 0 && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-primary font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        ${day.revenue.toFixed(0)}
                      </div>
                    )}
                  </div>
                </div>
                {(range === 7 || i % 5 === 0 || i === dailyStats.length - 1) && (
                  <span className="text-[9px] text-muted-foreground">{day.date}</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {stats.totalCustomers === 0 && (
          <Card className="p-6 rounded-2xl border-border text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium">No revenue yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Analytics will populate once fans make their first purchase.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
