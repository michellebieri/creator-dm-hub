import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Label {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export const useConversationLabels = (userId: string | null) => {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLabels = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('conversation_labels')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;
      setLabels(data || []);
    } catch (error) {
      console.error('Error fetching labels:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabels();

    if (!userId) return;

    // Subscribe to label changes
    const channel = supabase
      .channel('labels-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_labels',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchLabels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const createLabel = async (name: string, color: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('conversation_labels')
        .insert({
          user_id: userId,
          name,
          color,
        });

      if (error) throw error;

      toast({
        title: 'Label created',
        description: `"${name}" label has been created`,
      });

      return true;
    } catch (error: any) {
      console.error('Error creating label:', error);
      toast({
        title: 'Error',
        description: error.code === '23505' ? 'Label name already exists' : 'Failed to create label',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateLabel = async (labelId: string, name: string, color: string) => {
    try {
      const { error } = await supabase
        .from('conversation_labels')
        .update({ name, color })
        .eq('id', labelId);

      if (error) throw error;

      toast({
        title: 'Label updated',
        description: 'Label has been updated successfully',
      });

      return true;
    } catch (error: any) {
      console.error('Error updating label:', error);
      toast({
        title: 'Error',
        description: 'Failed to update label',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteLabel = async (labelId: string) => {
    try {
      const { error } = await supabase
        .from('conversation_labels')
        .delete()
        .eq('id', labelId);

      if (error) throw error;

      toast({
        title: 'Label deleted',
        description: 'Label has been deleted',
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting label:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete label',
        variant: 'destructive',
      });
      return false;
    }
  };

  const assignLabel = async (conversationId: string, labelId: string) => {
    try {
      const { error } = await supabase
        .from('conversation_label_assignments')
        .insert({
          conversation_id: conversationId,
          label_id: labelId,
        });

      if (error) throw error;
      return true;
    } catch (error: any) {
      if (error.code !== '23505') { // Ignore duplicate errors
        console.error('Error assigning label:', error);
        toast({
          title: 'Error',
          description: 'Failed to assign label',
          variant: 'destructive',
        });
      }
      return false;
    }
  };

  const unassignLabel = async (conversationId: string, labelId: string) => {
    try {
      const { error } = await supabase
        .from('conversation_label_assignments')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('label_id', labelId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error unassigning label:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove label',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    labels,
    loading,
    createLabel,
    updateLabel,
    deleteLabel,
    assignLabel,
    unassignLabel,
    refetch: fetchLabels,
  };
};
