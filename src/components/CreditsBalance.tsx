import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CreditsBalanceProps {
  creatorId: string;
}

export const CreditsBalance = ({ creatorId }: CreditsBalanceProps) => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCredits = async () => {
      try {
        const { data, error } = await supabase
          .from('customer_credits')
          .select('credits_remaining')
          .eq('customer_id', user.id)
          .eq('creator_id', creatorId)
          .maybeSingle();

        if (error) throw error;
        setCredits(data?.credits_remaining || 0);
      } catch (error) {
        console.error('Error fetching credits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();

    // Subscribe to credit changes
    const channel = supabase
      .channel('credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_credits',
          filter: `customer_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && 'credits_remaining' in payload.new) {
            setCredits((payload.new as any).credits_remaining);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, creatorId]);

  if (loading) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Coins className="w-5 h-5 text-primary" />
        <div>
          <div className="text-sm text-muted-foreground">Message Credits</div>
          <div className="text-2xl font-bold">{credits}</div>
        </div>
      </div>
    </Card>
  );
};
