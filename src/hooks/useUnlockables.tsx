import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Unlockable {
  id: string;
  message_id: string;
  media_type: 'image' | 'video' | 'audio' | 'document';
  media_url: string;
  price: number;
  creator_id: string;
  unlocked_by: string[] | null;
}

export const useUnlockables = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const createUnlockable = async (
    messageId: string,
    mediaType: 'image' | 'video' | 'audio' | 'document',
    mediaUrl: string,
    price: number,
    creatorId: string
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('unlockables')
        .insert({
          message_id: messageId,
          media_type: mediaType,
          media_url: mediaUrl,
          price,
          creator_id: creatorId,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Unlockable content created');
      return data;
    } catch (error) {
      console.error('Error creating unlockable:', error);
      toast.error('Failed to create unlockable');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const unlockContent = async (unlockableId: string, price: number, creatorId: string) => {
    if (!user) return null;

    setLoading(true);
    try {
      // Check if user has enough credits
      const { data: credits, error: creditsError } = await supabase
        .from('customer_credits')
        .select('credits_remaining')
        .eq('customer_id', user.id)
        .eq('creator_id', creatorId)
        .single();

      if (creditsError || !credits || credits.credits_remaining < price) {
        toast.error('Insufficient credits');
        return null;
      }

      // Deduct credits
      const { error: updateError } = await supabase
        .from('customer_credits')
        .update({ credits_remaining: credits.credits_remaining - price })
        .eq('customer_id', user.id)
        .eq('creator_id', creatorId);

      if (updateError) throw updateError;

      // Update unlockable
      const { data: unlockable, error: unlockError } = await supabase
        .from('unlockables')
        .select('unlocked_by')
        .eq('id', unlockableId)
        .single();

      if (unlockError) throw unlockError;

      const unlockedBy = unlockable.unlocked_by || [];
      if (!unlockedBy.includes(user.id)) {
        unlockedBy.push(user.id);
      }

      const { error: finalError } = await supabase
        .from('unlockables')
        .update({ unlocked_by: unlockedBy })
        .eq('id', unlockableId);

      if (finalError) throw finalError;

      // Record transaction
      await supabase.from('transactions').insert({
        customer_id: user.id,
        creator_id: creatorId,
        amount: price,
        net_amount: price * 0.85,
        platform_fee: price * 0.15,
        processor_fee: 0,
        transaction_type: 'unlockable',
        status: 'completed',
      });

      // Create notification for creator
      supabase.functions.invoke('create-notification', {
        body: {
          userId: creatorId,
          type: 'content_unlocked',
          title: 'Content Unlocked',
          message: `Someone unlocked your content for $${price.toFixed(2)}`,
          link: '/earnings',
        },
      }).catch(err => console.log('Notification error:', err));

      toast.success('Content unlocked!');
      return true;
    } catch (error) {
      console.error('Error unlocking content:', error);
      toast.error('Failed to unlock content');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = (unlockable: Unlockable) => {
    if (!user) return false;
    return unlockable.unlocked_by?.includes(user.id) || false;
  };

  return {
    createUnlockable,
    unlockContent,
    isUnlocked,
    loading,
  };
};
