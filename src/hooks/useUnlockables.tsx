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
      // Deduct from wallet using atomic RPC (prevents race conditions)
      const { data: spendResult, error: spendError } = await supabase.rpc('spend_wallet_balance', {
        p_user_id: user.id,
        p_amount: price,
        p_transaction_type: 'unlockable',
        p_description: 'Unlocked content in message',
        p_related_user_id: creatorId,
      });

      if (spendError) {
        console.error('Wallet spend error:', spendError.message);
        toast.error('Failed to process payment');
        return null;
      }

      const result = spendResult as { success: boolean; error?: string } | null;
      if (!result?.success) {
        toast.error(result?.error === 'Insufficient balance' ? 'Insufficient wallet balance' : 'Payment failed');
        return null;
      }

      // Update unlocked_by array
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

      if (finalError) console.error('Failed to update unlocked_by:', finalError.message);

      // Record earning in transactions table so creator sees revenue
      const { data: txResult, error: txError } = await supabase.rpc('insert_completed_transaction', {
        p_creator_id: creatorId,
        p_amount: price,
        p_transaction_type: 'unlockable',
      });
      if (txError) console.error('Transaction RPC error:', txError.message);
      if (txResult && !txResult.success) console.error('Transaction failed:', txResult.error);

      // Notify creator
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
