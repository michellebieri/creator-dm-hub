import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UserPresence {
  userId: string;
  onlineAt: string;
  status: 'online' | 'away' | 'offline';
}

export const usePresence = (channelName: string = 'global-presence') => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresence>>(new Map());
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) {
      setOnlineUsers(new Map());
      return;
    }

    const presenceChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const usersMap = new Map<string, UserPresence>();

        Object.entries(state).forEach(([userId, presences]) => {
          const presence = presences[0] as any;
          usersMap.set(userId, {
            userId,
            onlineAt: presence.online_at,
            status: presence.status || 'online',
          });
        });

        setOnlineUsers(usersMap);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers(prev => {
          const updated = new Map(prev);
          const presence = newPresences[0] as any;
          updated.set(key, {
            userId: key,
            onlineAt: presence.online_at,
            status: presence.status || 'online',
          });
          return updated;
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const updated = new Map(prev);
          updated.delete(key);
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
            status: 'online',
          });
        }
      });

    setChannel(presenceChannel);

    // Update status every 30 seconds to maintain presence
    const interval = setInterval(async () => {
      if (presenceChannel) {
        await presenceChannel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
          status: 'online',
        });
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      if (presenceChannel) {
        presenceChannel.untrack();
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [user, channelName]);

  const isUserOnline = (userId: string): boolean => {
    if (!userId) return false;
    const presence = onlineUsers.get(userId);
    if (!presence) return false;

    // Consider user offline if last seen more than 2 minutes ago
    const lastSeen = new Date(presence.onlineAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    
    return diffMinutes < 2;
  };

  const getUserStatus = (userId: string): 'online' | 'away' | 'offline' => {
    if (!userId) return 'offline';
    const presence = onlineUsers.get(userId);
    if (!presence) return 'offline';

    const lastSeen = new Date(presence.onlineAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    
    if (diffMinutes < 2) return 'online';
    if (diffMinutes < 10) return 'away';
    return 'offline';
  };

  const updateStatus = async (status: 'online' | 'away' | 'offline') => {
    if (!channel || !user) return;
    
    await channel.track({
      user_id: user.id,
      online_at: new Date().toISOString(),
      status,
    });
  };

  return {
    onlineUsers: Array.from(onlineUsers.values()),
    onlineUserIds: Array.from(onlineUsers.keys()),
    isUserOnline,
    getUserStatus,
    updateStatus,
  };
};
