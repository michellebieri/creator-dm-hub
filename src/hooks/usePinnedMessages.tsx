import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePinnedMessages = (conversationId: string | null, userId: string | null) => {
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPinnedMessages = async () => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_pinned', true)
        .order('pinned_at', { ascending: false });

      if (error) throw error;
      setPinnedMessages(data || []);
    } catch (error) {
      console.error('Error fetching pinned messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPinnedMessages();

    if (!conversationId) return;

    // Subscribe to pinned message changes
    const channel = supabase
      .channel(`pinned-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchPinnedMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const pinMessage = async (messageId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('messages')
        .update({
          is_pinned: true,
          pinned_at: new Date().toISOString(),
          pinned_by: userId,
        })
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: 'Message pinned',
        description: 'Message has been pinned to the top',
      });

      return true;
    } catch (error) {
      console.error('Error pinning message:', error);
      toast({
        title: 'Error',
        description: 'Failed to pin message',
        variant: 'destructive',
      });
      return false;
    }
  };

  const unpinMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          is_pinned: false,
          pinned_at: null,
          pinned_by: null,
        })
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: 'Message unpinned',
        description: 'Message has been unpinned',
      });

      return true;
    } catch (error) {
      console.error('Error unpinning message:', error);
      toast({
        title: 'Error',
        description: 'Failed to unpin message',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    pinnedMessages,
    loading,
    pinMessage,
    unpinMessage,
    refetch: fetchPinnedMessages,
  };
};
