import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useCredits = (creatorId: string | null) => {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !creatorId) {
      setLoading(false);
      return;
    }

    const fetchCredits = async () => {
      const { data, error } = await supabase
        .from('customer_credits')
        .select('credits_remaining')
        .eq('customer_id', user.id)
        .eq('creator_id', creatorId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching credits:', error);
      } else {
        setCredits(data?.credits_remaining || 0);
      }
      setLoading(false);
    };

    fetchCredits();

    // Subscribe to credit changes
    const channel = supabase
      .channel(`credits-${user.id}-${creatorId}`)
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
            const newData = payload.new as any;
            if (newData.creator_id === creatorId) {
              setCredits(newData.credits_remaining);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, creatorId]);

  const deductCredit = async () => {
    if (!user || !creatorId || credits <= 0) {
      return false;
    }

    const { error } = await supabase
      .from('customer_credits')
      .update({ credits_remaining: credits - 1 })
      .eq('customer_id', user.id)
      .eq('creator_id', creatorId);

    if (error) {
      console.error('Error deducting credit:', error);
      return false;
    }

    return true;
  };

  return { credits, loading, deductCredit, hasCredits: credits > 0 };
};
