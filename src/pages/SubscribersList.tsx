import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Users, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Subscriber {
  id: string;
  customer_id: string;
  tier_name: string;
  status: string;
  current_period_end: string;
  customer_name: string;
  customer_username: string;
  customer_avatar: string | null;
}

const SubscribersList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);

  useEffect(() => {
    if (user) {
      fetchSubscribers();
    }
  }, [user]);

  const fetchSubscribers = async () => {
    if (!user) return;

    try {
      // creator_subscriptions has no creator_id column — filter via the creator's tier IDs
      const { data: creatorTiers, error: tiersError } = await supabase
        .from('subscription_tiers')
        .select('id, name')
        .eq('creator_id', user.id);

      if (tiersError) throw tiersError;

      const creatorTierIds = creatorTiers?.map(t => t.id) || [];

      if (creatorTierIds.length === 0) {
        setSubscribers([]);
        setLoading(false);
        return;
      }

      const { data: subscriptions, error: subsError } = await supabase
        .from('creator_subscriptions')
        .select(`
          id,
          customer_id,
          status,
          current_period_end,
          tier_id
        `)
        .in('status', ['active', 'canceling']) // canceling = paid through period end
        .in('tier_id', creatorTierIds)
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;

      // Build tier name map from already-fetched tiers
      const tierIds = [...new Set(subscriptions?.map(s => s.tier_id) || [])];
      const tiers = creatorTiers?.filter(t => tierIds.includes(t.id));

      const tierMap = new Map((tiers || []).map(t => [t.id, t.name]));

      // Get customer profiles
      const customerIds = subscriptions?.map(s => s.customer_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', customerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const formatted = subscriptions?.map(sub => {
        const profile = profileMap.get(sub.customer_id);
        return {
          id: sub.id,
          customer_id: sub.customer_id,
          tier_name: tierMap.get(sub.tier_id) || 'Unknown Tier',
          status: sub.status,
          current_period_end: sub.current_period_end,
          customer_name: profile?.display_name || 'Unknown',
          customer_username: profile?.username || 'unknown',
          customer_avatar: profile?.avatar_url || null,
        };
      }) || [];

      setSubscribers(formatted);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      toast.error('Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-6xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">My Subscribers</h1>
          <div className="w-10" />
        </div>
      </header>
      <div className="container mx-auto p-6 max-w-6xl">
      <p className="text-muted-foreground mb-6">
        {subscribers.length} active subscriber{subscribers.length !== 1 ? 's' : ''}
      </p>

      {subscribers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Subscribers Yet"
          description="You don't have any active subscribers yet"
        />
      ) : (
        <div className="grid gap-4">
          {subscribers.map((subscriber) => (
            <Card key={subscriber.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={subscriber.customer_avatar || ''} />
                      <AvatarFallback>{subscriber.customer_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{subscriber.customer_name}</h3>
                      <p className="text-sm text-muted-foreground">@{subscriber.customer_username}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{subscriber.tier_name}</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Renews: {new Date(subscriber.current_period_end).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default SubscribersList;
