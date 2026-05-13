import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSubscription = (userId: string | undefined, creatorId: string | null) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!userId || !creatorId) {
      setIsSubscribed(false);
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      // Get all active subscriptions for this user
      // Include 'canceling' — user keeps access until current_period_end
      const { data } = await supabase
        .from('creator_subscriptions')
        .select('*, subscription_tiers!inner(*)')
        .eq('customer_id', userId)
        .in('status', ['active', 'canceling']);

      if (data && data.length > 0) {
        // Check if any subscription is for this creator
        const creatorSub = data.find((sub: any) => 
          sub.subscription_tiers?.creator_id === creatorId
        );
        
        if (creatorSub) {
          // Check if subscription is still valid (not expired)
          const periodEnd = new Date(creatorSub.current_period_end);
          if (periodEnd > new Date()) {
            setIsSubscribed(true);
            setSubscription(creatorSub);
          } else {
            setIsSubscribed(false);
            setSubscription(null);
          }
        } else {
          setIsSubscribed(false);
          setSubscription(null);
        }
      } else {
        setIsSubscribed(false);
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsSubscribed(false);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [userId, creatorId]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return {
    isSubscribed,
    subscription,
    loading,
    refetch: checkSubscription,
  };
};
