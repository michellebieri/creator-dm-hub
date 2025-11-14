import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TypingUser {
  userId: string;
  displayName: string;
}

export const useTypingIndicator = (conversationId: string | null, userId: string | null) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId || !userId) return;

    const roomChannel = supabase.channel(`typing:${conversationId}`);

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        const state = roomChannel.presenceState();
        const users: TypingUser[] = [];
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.userId !== userId && presence.isTyping) {
              users.push({
                userId: presence.userId,
                displayName: presence.displayName,
              });
            }
          });
        });
        
        setTypingUsers(users);
      })
      .subscribe();

    setChannel(roomChannel);

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [conversationId, userId]);

  const startTyping = async (displayName: string) => {
    if (!channel || !userId) return;
    
    await channel.track({
      userId,
      displayName,
      isTyping: true,
    });
  };

  const stopTyping = async () => {
    if (!channel || !userId) return;
    
    await channel.track({
      userId,
      displayName: '',
      isTyping: false,
    });
  };

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
};
