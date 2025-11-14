import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useReadReceipts = (conversationId: string | null, userId: string | null) => {
  useEffect(() => {
    if (!conversationId || !userId) return;

    const markMessagesAsRead = async () => {
      // Mark all unread messages from the other user as read
      const { error } = await supabase
        .from('messages')
        .update({ 
          read_at: new Date().toISOString(),
          read_by: userId 
        })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null);

      if (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    // Mark messages as read when viewing conversation
    markMessagesAsRead();

    // Subscribe to new messages and mark them as read
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // If it's not our message, mark it as read
          if (payload.new.sender_id !== userId) {
            supabase
              .from('messages')
              .update({ 
                read_at: new Date().toISOString(),
                read_by: userId 
              })
              .eq('id', payload.new.id)
              .then(({ error }) => {
                if (error) console.error('Error marking new message as read:', error);
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);
};
