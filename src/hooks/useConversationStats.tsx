import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConversationStats {
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
  averageResponseTime: number | null;
  lastActivity: string | null;
  mostActiveDay: string | null;
  unreadCount: number;
}

export const useConversationStats = (conversationId: string | null, userId: string | null) => {
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId || !userId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        // Fetch all messages
        const { data: messages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (!messages || messages.length === 0) {
          setStats({
            totalMessages: 0,
            sentMessages: 0,
            receivedMessages: 0,
            averageResponseTime: null,
            lastActivity: null,
            mostActiveDay: null,
            unreadCount: 0,
          });
          setLoading(false);
          return;
        }

        // Calculate basic stats
        const sentMessages = messages.filter(m => m.sender_id === userId).length;
        const receivedMessages = messages.filter(m => m.sender_id !== userId).length;
        const unreadCount = messages.filter(
          m => m.sender_id !== userId && !m.read_at
        ).length;

        // Calculate average response time
        let responseTimes: number[] = [];
        for (let i = 1; i < messages.length; i++) {
          const currentMsg = messages[i];
          const previousMsg = messages[i - 1];
          
          // Check if this is a response (different sender)
          if (currentMsg.sender_id !== previousMsg.sender_id) {
            const responseTime = 
              new Date(currentMsg.created_at).getTime() - 
              new Date(previousMsg.created_at).getTime();
            responseTimes.push(responseTime);
          }
        }

        const averageResponseTime = responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : null;

        // Find most active day
        const dayCount: Record<string, number> = {};
        messages.forEach(msg => {
          const day = new Date(msg.created_at).toLocaleDateString('en-US', { weekday: 'long' });
          dayCount[day] = (dayCount[day] || 0) + 1;
        });

        const mostActiveDay = Object.entries(dayCount).reduce((a, b) => 
          b[1] > a[1] ? b : a
        )[0];

        const lastActivity = messages[messages.length - 1]?.created_at || null;

        setStats({
          totalMessages: messages.length,
          sentMessages,
          receivedMessages,
          averageResponseTime,
          lastActivity,
          mostActiveDay,
          unreadCount,
        });
      } catch (error) {
        console.error('Error fetching conversation stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Subscribe to message changes
    const channel = supabase
      .channel(`stats-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  return { stats, loading };
};
