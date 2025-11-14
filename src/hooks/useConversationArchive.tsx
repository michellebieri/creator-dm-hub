import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useConversationArchive = () => {
  const { toast } = useToast();

  const archiveConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('conversations')
      .update({ status: 'archived' })
      .eq('id', conversationId);

    if (error) {
      console.error('Error archiving conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive conversation',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Conversation archived',
      description: 'You can view archived conversations anytime',
    });
    return true;
  };

  const unarchiveConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('conversations')
      .update({ status: 'active' })
      .eq('id', conversationId);

    if (error) {
      console.error('Error unarchiving conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to unarchive conversation',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Conversation restored',
      description: 'Conversation moved back to inbox',
    });
    return true;
  };

  return {
    archiveConversation,
    unarchiveConversation,
  };
};
