import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useCredits = (creatorId: string | null) => {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  // Sum ALL rows — each pack purchase creates its own row, user may have bought multiple packs
  const fetchCredits = useCallback(async () => {
    if (!user || !creatorId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('customer_credits')
      .select('credits_remaining')
      .eq('customer_id', user.id)
      .eq('creator_id', creatorId)
      .gt('credits_remaining', 0);

    if (error) {
      console.error('Error fetching credits:', error);
    } else {
      const total = data?.reduce((sum, row) => sum + (row.credits_remaining || 0), 0) || 0;
      setCredits(total);
    }
    setLoading(false);
  }, [user, creatorId]);

  useEffect(() => {
    fetchCredits();

    if (!user || !creatorId) return;

    // Re-fetch total on any change to customer_credits for this user
    // (simpler and correct for multi-row model — don't try to update from a single row event)
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
          const newData = payload.new as any;
          if (!newData || newData.creator_id === creatorId) {
            // Re-fetch and sum all rows instead of trusting a single row's value
            fetchCredits();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, creatorId, fetchCredits]);

  const deductCredit = async () => {
    if (!user || !creatorId || credits <= 0) {
      return false;
    }

    try {
      const { data: result, error } = await supabase
        .rpc('spend_bundle_credit', {
          p_customer_id: user.id,
          p_creator_id: creatorId,
        });

      if (error) {
        console.error('Error deducting credit:', error);
        return false;
      }

      const spendResult = result as { success: boolean; remaining?: number; error?: string } | null;

      if (spendResult?.success) {
        // Re-fetch total across all rows after deduction
        await fetchCredits();
        return true;
      }

      console.error('Credit deduction failed:', spendResult?.error);
      return false;
    } catch (error) {
      console.error('Unexpected error in deductCredit:', error);
      return false;
    }
  };

  return { credits, loading, deductCredit, hasCredits: credits > 0 };
};
