import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MessageTemplate {
  id: string;
  creator_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const useMessageTemplates = (creatorId: string | null) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    if (!creatorId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, [creatorId]);

  const createTemplate = async (title: string, content: string) => {
    if (!creatorId) return;

    const { error } = await supabase
      .from('message_templates')
      .insert({
        creator_id: creatorId,
        title,
        content,
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Template created',
      description: 'Your message template has been saved',
    });
    fetchTemplates();
    return true;
  };

  const updateTemplate = async (id: string, title: string, content: string) => {
    const { error } = await supabase
      .from('message_templates')
      .update({ title, content })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Template updated',
      description: 'Your changes have been saved',
    });
    fetchTemplates();
    return true;
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Template deleted',
      description: 'Template has been removed',
    });
    fetchTemplates();
    return true;
  };

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: fetchTemplates,
  };
};
