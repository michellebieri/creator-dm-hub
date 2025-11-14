import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const EDIT_TIME_LIMIT = 15 * 60 * 1000; // 15 minutes in milliseconds

export const useMessageEdit = () => {
  const [editing, setEditing] = useState(false);
  const { toast } = useToast();

  const canEdit = (messageCreatedAt: string, senderId: string, currentUserId: string) => {
    if (senderId !== currentUserId) return false;
    
    const createdTime = new Date(messageCreatedAt).getTime();
    const now = Date.now();
    const timeDiff = now - createdTime;
    
    return timeDiff < EDIT_TIME_LIMIT;
  };

  const getTimeRemaining = (messageCreatedAt: string) => {
    const createdTime = new Date(messageCreatedAt).getTime();
    const now = Date.now();
    const timeDiff = now - createdTime;
    const remaining = EDIT_TIME_LIMIT - timeDiff;
    
    if (remaining <= 0) return null;
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim()) {
      toast({
        title: 'Error',
        description: 'Message cannot be empty',
        variant: 'destructive',
      });
      return false;
    }

    setEditing(true);
    try {
      const { data: currentMessage, error: fetchError } = await supabase
        .from('messages')
        .select('content, edit_count')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      // Don't update if content is the same
      if (currentMessage.content === newContent.trim()) {
        toast({
          title: 'No changes',
          description: 'Message content is the same',
        });
        return false;
      }

      const { error: updateError } = await supabase
        .from('messages')
        .update({
          content: newContent.trim(),
          edited_at: new Date().toISOString(),
          edit_count: (currentMessage.edit_count || 0) + 1,
        })
        .eq('id', messageId);

      if (updateError) throw updateError;

      toast({
        title: 'Message updated',
        description: 'Your message has been edited',
      });

      return true;
    } catch (error: any) {
      console.error('Error editing message:', error);
      toast({
        title: 'Error',
        description: 'Failed to edit message',
        variant: 'destructive',
      });
      return false;
    } finally {
      setEditing(false);
    }
  };

  return {
    canEdit,
    editMessage,
    editing,
    getTimeRemaining,
  };
};
