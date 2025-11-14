import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Bookmark {
  id: string;
  message_id: string;
  note: string | null;
  created_at: string;
  message: {
    id: string;
    content: string;
    created_at: string;
    sender: {
      display_name: string;
      avatar_url: string | null;
    };
    conversation: {
      id: string;
      creator_id: string;
      customer_id: string;
    };
  };
}

export const useMessageBookmarks = (userId: string | null) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedMessageIds, setBookmarkedMessageIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchBookmarks = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('message_bookmarks')
        .select(`
          *,
          message:messages(
            id,
            content,
            created_at,
            conversation_id,
            sender:profiles!messages_sender_id_fkey(display_name, avatar_url),
            conversation:conversations(id, creator_id, customer_id)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBookmarks(data || []);
      setBookmarkedMessageIds(new Set(data?.map(b => b.message_id) || []));
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();

    if (!userId) return;

    // Subscribe to bookmark changes
    const channel = supabase
      .channel('bookmarks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_bookmarks',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchBookmarks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const addBookmark = async (messageId: string, note?: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('message_bookmarks')
        .insert({
          user_id: userId,
          message_id: messageId,
          note: note || null,
        });

      if (error) throw error;

      toast({
        title: 'Bookmark added',
        description: 'Message has been bookmarked',
      });

      return true;
    } catch (error: any) {
      console.error('Error adding bookmark:', error);
      toast({
        title: 'Error',
        description: error.code === '23505' ? 'Message already bookmarked' : 'Failed to add bookmark',
        variant: 'destructive',
      });
      return false;
    }
  };

  const removeBookmark = async (messageId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('message_bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('message_id', messageId);

      if (error) throw error;

      toast({
        title: 'Bookmark removed',
        description: 'Message bookmark has been removed',
      });

      return true;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove bookmark',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateBookmarkNote = async (bookmarkId: string, note: string) => {
    try {
      const { error } = await supabase
        .from('message_bookmarks')
        .update({ note })
        .eq('id', bookmarkId);

      if (error) throw error;

      toast({
        title: 'Note updated',
        description: 'Bookmark note has been updated',
      });

      return true;
    } catch (error) {
      console.error('Error updating bookmark note:', error);
      toast({
        title: 'Error',
        description: 'Failed to update note',
        variant: 'destructive',
      });
      return false;
    }
  };

  const isBookmarked = (messageId: string) => {
    return bookmarkedMessageIds.has(messageId);
  };

  return {
    bookmarks,
    loading,
    addBookmark,
    removeBookmark,
    updateBookmarkNote,
    isBookmarked,
    refetch: fetchBookmarks,
  };
};
