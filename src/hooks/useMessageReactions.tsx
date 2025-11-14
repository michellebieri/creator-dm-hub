import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

interface ReactionSummary {
  reaction: string;
  count: number;
  users: string[];
  hasUserReacted: boolean;
}

export const useMessageReactions = (messageId: string | null, userId: string | null) => {
  const [reactions, setReactions] = useState<ReactionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReactions = async () => {
    if (!messageId) return;

    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId);

      if (error) throw error;

      // Group reactions by emoji
      const grouped = (data || []).reduce((acc: Record<string, ReactionSummary>, reaction: Reaction) => {
        if (!acc[reaction.reaction]) {
          acc[reaction.reaction] = {
            reaction: reaction.reaction,
            count: 0,
            users: [],
            hasUserReacted: false,
          };
        }
        acc[reaction.reaction].count++;
        acc[reaction.reaction].users.push(reaction.user_id);
        if (userId && reaction.user_id === userId) {
          acc[reaction.reaction].hasUserReacted = true;
        }
        return acc;
      }, {});

      setReactions(Object.values(grouped));
    } catch (error) {
      console.error('Error fetching reactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!messageId) return;

    fetchReactions();

    // Subscribe to reaction changes
    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`,
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, userId]);

  const addReaction = async (reaction: string) => {
    if (!messageId || !userId) return;

    try {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: userId,
          reaction,
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error adding reaction:', error);
      if (error.code === '23505') {
        // Duplicate reaction, remove it instead
        await removeReaction(reaction);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add reaction',
          variant: 'destructive',
        });
      }
    }
  };

  const removeReaction = async (reaction: string) => {
    if (!messageId || !userId) return;

    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('reaction', reaction);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove reaction',
        variant: 'destructive',
      });
    }
  };

  const toggleReaction = async (reaction: string) => {
    const existingReaction = reactions.find((r) => r.reaction === reaction);
    if (existingReaction?.hasUserReacted) {
      await removeReaction(reaction);
    } else {
      await addReaction(reaction);
    }
  };

  return {
    reactions,
    loading,
    toggleReaction,
  };
};
