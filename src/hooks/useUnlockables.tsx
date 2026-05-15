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
      // Single atomic RPC: checks already-unlocked, deducts wallet, updates
      // unlocked_by, and records the transaction — all in one DB transaction.
      // If any step fails the entire operation rolls back (no partial charges).
      const { data: result, error } = await supabase.rpc('unlock_content', {
        p_unlockable_id: unlockableId,
        p_creator_id:    creatorId,
        p_price:         price,
      });

      if (error) {
        console.error('unlock_content RPC error:', error.message);
        toast.error(error.message || 'Failed to process payment');
        return null;
      }

      const res = result as { success: boolean; error?: string; already_unlocked?: boolean } | null;

      if (!res?.success) {
        const msg = res?.error === 'Insufficient balance'
          ? 'Insufficient wallet balance'
          : (res?.error || 'Payment failed');
        toast.error(msg);
        return null;
      }

      if (res.already_unlocked) {
        // Already paid — just surface the content without charging
        return true;
      }

      // Notify creator (fire-and-forget — non-critical)
      supabase.functions.invoke('create-notification', {
        body: {
          userId: creatorId,
          type: 'content_unlocked',
          title: 'Content Unlocked',
          message: `Someone unlocked your content for $${price.toFixed(2)}`,
          link: '/earnings',
        },
      }).catch(err => console.log('Notification error (non-fatal):', err));

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
