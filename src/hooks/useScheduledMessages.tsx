import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScheduledMessage {
  id: string;
  conversation_id: string;
  content: string;
  scheduled_at: string;
  status: string;
  message_type: string;
  voice_url?: string;
  voice_duration?: number;
  created_at: string;
}

export const useScheduledMessages = (senderId: string | null) => {
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchScheduledMessages = async () => {
    if (!senderId) return;

    try {
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('sender_id', senderId)
        .in('status', ['pending', 'sent'])
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setScheduledMessages(data || []);
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledMessages();

    if (!senderId) return;

    // Subscribe to changes
    const channel = supabase
      .channel('scheduled-messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_messages',
          filter: `sender_id=eq.${senderId}`,
        },
        () => {
          fetchScheduledMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [senderId]);

  const scheduleMessage = async (
    conversationId: string,
    content: string,
    scheduledAt: Date,
    messageType: string = 'text',
    voiceUrl?: string,
    voiceDuration?: number
  ) => {
    if (!senderId) return false;

    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          scheduled_at: scheduledAt.toISOString(),
          message_type: messageType,
          voice_url: voiceUrl,
          voice_duration: voiceDuration,
        });

      if (error) throw error;

      toast({
        title: 'Message scheduled',
        description: `Will be sent on ${scheduledAt.toLocaleString()}`,
      });

      return true;
    } catch (error: any) {
      console.error('Error scheduling message:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule message',
        variant: 'destructive',
      });
      return false;
    }
  };

  const cancelScheduledMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .update({ status: 'cancelled' })
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: 'Message cancelled',
        description: 'Scheduled message has been cancelled',
      });

      return true;
    } catch (error: any) {
      console.error('Error cancelling message:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel message',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    scheduledMessages,
    loading,
    scheduleMessage,
    cancelScheduledMessage,
    refetch: fetchScheduledMessages,
  };
};
