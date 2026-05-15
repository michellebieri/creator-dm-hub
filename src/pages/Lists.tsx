import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Follower {
  id: string;
  follower_id: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

type FilterKey =
  | 'all'
  | 'paying'
  | 'nonpaying'
  | 'subscribers'
  | 'lostSubs'
  | 'spenders100'
  | 'spenders1000';

const Lists = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [spendByCustomer, setSpendByCustomer] = useState<Record<string, number>>({});
  const [activeSubscriberIds, setActiveSubscriberIds] = useState<Set<string>>(new Set());
  const [lostSubscriberIds, setLostSubscriberIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  useEffect(() => {
    if (user) {
      fetchFollowers();
      fetchCustomerSpend();
      fetchSubscriptions();

      const channel = supabase
        .channel('followers-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_follows',
            filter: `following_id=eq.${user.id}`
          },
          () => {
            fetchFollowers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchFollowers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select(`
          id,
          follower_id,
          created_at,
          profiles!user_follows_follower_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('following_id', user.id)
        .neq('follower_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFollowers(data || []);
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerSpend = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('customer_id, amount')
        .eq('creator_id', user.id)
        .eq('status', 'completed');
      if (error) throw error;
      const totals: Record<string, number> = {};
      for (const t of data || []) {
        const cid = (t as any).customer_id as string;
        const amt = Number((t as any).amount) || 0;
        if (!cid) continue;
        totals[cid] = (totals[cid] || 0) + amt;
      }
      setSpendByCustomer(totals);
    } catch (e) {
      console.error('Error fetching transactions:', e);
    }
  };

  const fetchSubscriptions = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('creator_subscriptions')
        .select('customer_id, status')
        .eq('creator_id', user.id);
      if (error) throw error;
      const active = new Set<string>();
      const lost = new Set<string>();
      for (const s of data || []) {
        const cid = (s as any).customer_id as string;
        const status = (s as any).status as string;
        if (!cid) continue;
        if (status === 'active' || status === 'canceling') active.add(cid);
        else if (status === 'cancelled' || status === 'expired' || status === 'past_due') lost.add(cid);
      }
      setActiveSubscriberIds(active);
      setLostSubscriberIds(lost);
    } catch (e) {
      console.error('Error fetching subscriptions:', e);
    }
  };

  const followerIds = followers.map(f => f.follower_id);
  const payingCount = followerIds.filter(id => (spendByCustomer[id] || 0) > 0).length;
  const subscribersCount = followerIds.filter(id => activeSubscriberIds.has(id)).length;
  const lostSubscribersCount = followerIds.filter(id => lostSubscriberIds.has(id)).length;
  const spender100Count = followerIds.filter(id => (spendByCustomer[id] || 0) >= 100).length;
  const spender1000Count = followerIds.filter(id => (spendByCustomer[id] || 0) >= 1000).length;

  const filteredFollowers = followers.filter(f => {
    const spend = spendByCustomer[f.follower_id] || 0;
    switch (activeFilter) {
      case 'paying': return spend > 0;
      case 'nonpaying': return spend === 0;
      case 'subscribers': return activeSubscriberIds.has(f.follower_id);
      case 'lostSubs': return lostSubscriberIds.has(f.follower_id);
      case 'spenders100': return spend >= 100;
      case 'spenders1000': return spend >= 1000;
      default: return true;
    }
  });

  const defaultLists: { key: FilterKey; name: string; path: string }[] = [
    { key: 'all', name: `All followers (${followers.length})`, path: '#' },
    { key: 'paying', name: `Paying followers (${payingCount})`, path: '#' },
    { key: 'nonpaying', name: `Non-paying followers (${followers.length - payingCount})`, path: '#' },
    { key: 'subscribers', name: `All subscribers (${subscribersCount})`, path: '#' },
    { key: 'lostSubs', name: `Lost subscribers (${lostSubscribersCount})`, path: '#' },
    { key: 'spenders100', name: `$100+ spenders (${spender100Count})`, path: '#' },
    { key: 'spenders1000', name: `$1000+ spenders (${spender1000Count})`, path: '#' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Followers & Subscribers</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto">
        {/* Followers Section - Primary View */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-primary">Followers ({followers.length})</h2>
          </div>

          {loading ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">Loading followers...</p>
            </Card>
          ) : filteredFollowers.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">
                {followers.length === 0
                  ? 'No followers yet. Share your profile to get followers!'
                  : 'No followers match this filter.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredFollowers.map((follower) => {
                const spend = spendByCustomer[follower.follower_id] || 0;
                return (
                  <Card key={follower.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={follower.profiles?.avatar_url || ''} />
                        <AvatarFallback>
                          {follower.profiles?.display_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{follower.profiles?.display_name}</p>
                        <p className="text-sm text-muted-foreground">@{follower.profiles?.username}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Followed {formatDistanceToNow(new Date(follower.created_at), { addSuffix: true })}
                          {spend > 0 && ` • $${spend.toFixed(2)} spent`}
                          {activeSubscriberIds.has(follower.follower_id) && ' • Subscriber'}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Filters Section */}
        <div className="px-4 py-3 mt-6">
          <p className="text-xs font-bold text-primary uppercase tracking-wider">Filter Options</p>
        </div>

        <div className="px-4 space-y-2">
          {defaultLists.map((list) => {
            const isActive = activeFilter === list.key;
            return (
              <button
                key={list.key}
                onClick={() => setActiveFilter(list.key)}
                className={`flex items-center justify-between w-full px-4 py-3 ${
                  isActive
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-card border-border hover:bg-muted/50'
                } transition-colors rounded-lg border`}
              >
                <span className={`text-base ${isActive ? 'font-semibold text-primary' : 'font-normal'}`}>{list.name}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Lists;
