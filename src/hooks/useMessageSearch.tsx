import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SearchFilters {
  query: string;
  messageType?: string;
  dateFrom?: string;
  dateTo?: string;
  conversationId?: string;
  hasReactions?: boolean;
  isPinned?: boolean;
}

interface SearchResult {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  message_type: string;
  is_pinned: boolean;
  conversation_id: string;
  sender: {
    display_name: string;
    avatar_url?: string;
  };
  conversation: {
    creator: {
      display_name: string;
    };
    customer: {
      display_name: string;
    };
  };
}

export const useMessageSearch = (userId: string | null) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const search = async (filters: SearchFilters) => {
    if (!userId || !filters.query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // First, get conversation IDs for the user
      const { data: userConversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`creator_id.eq.${userId},customer_id.eq.${userId}`);

      const conversationIds = userConversations?.map(c => c.id) || [];

      if (conversationIds.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(display_name, avatar_url),
          conversation:conversations!messages_conversation_id_fkey(
            creator_id,
            customer_id,
            creator:profiles!conversations_creator_id_fkey(display_name),
            customer:profiles!conversations_customer_id_fkey(display_name)
          )
        `)
        .ilike('content', `%${filters.query}%`)
        .in('conversation_id', conversationIds);

      // Apply filters
      if (filters.messageType && filters.messageType !== 'all') {
        query = query.eq('message_type', filters.messageType as 'text' | 'voice' | 'unlockable');
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters.conversationId && filters.conversationId !== 'all') {
        query = query.eq('conversation_id', filters.conversationId);
      }

      if (filters.isPinned !== undefined) {
        query = query.eq('is_pinned', filters.isPinned);
      }

      query = query.order('created_at', { ascending: false }).limit(50);

      const { data, error } = await query;

      if (error) throw error;

      // Filter by reactions if needed
      let filteredResults = data || [];
      if (filters.hasReactions) {
        const messageIds = filteredResults.map(m => m.id);
        if (messageIds.length > 0) {
          const { data: reactionsData } = await supabase
            .from('message_reactions')
            .select('message_id')
            .in('message_id', messageIds);

          const messagesWithReactions = new Set(reactionsData?.map(r => r.message_id) || []);
          filteredResults = filteredResults.filter(m => messagesWithReactions.has(m.id));
        }
      }

      setResults(filteredResults as SearchResult[]);
    } catch (error: any) {
      console.error('Error searching messages:', error);
      toast({
        title: 'Search error',
        description: 'Failed to search messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return {
    results,
    loading,
    search,
    clearResults,
  };
};
