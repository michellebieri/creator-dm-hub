import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessagePackSettings } from '@/components/MessagePackSettings';
import { StatsCard } from '@/components/StatsCard';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Users, DollarSign, TrendingUp } from 'lucide-react';

const CreatorDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalCustomers: 0,
    totalEarnings: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      // Fetch message count
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

      // Fetch earnings
      const { data: transactions } = await supabase
        .from('transactions')
        .select('net_amount')
        .eq('creator_id', user.id)
        .eq('status', 'completed');

      const totalEarnings = transactions?.reduce((sum, t) => sum + t.net_amount, 0) || 0;

      setStats({
        totalMessages: messageCount || 0,
        totalCustomers: uniqueCustomers,
        totalEarnings,
      });
    };

    fetchStats();
  }, [user]);

  if (loading) return null;
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Creator Dashboard</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Messages"
            value={stats.totalMessages}
            icon={MessageCircle}
            description="Messages sent"
          />
          <StatsCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={Users}
            description="Unique customers"
          />
          <StatsCard
            title="Total Earnings"
            value={`$${stats.totalEarnings.toFixed(2)}`}
            icon={DollarSign}
            description="All-time revenue"
            trend={{ value: 12, isPositive: true }}
          />
        </div>

        <MessagePackSettings />
      </div>
    </div>
  );
};

export default CreatorDashboard;
