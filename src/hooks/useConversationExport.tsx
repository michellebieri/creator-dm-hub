import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ExportOptions {
  format: 'json' | 'txt';
  dateFrom?: string;
  dateTo?: string;
  includeMetadata?: boolean;
}

export const useConversationExport = () => {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const exportConversation = async (
    conversationId: string,
    options: ExportOptions
  ) => {
    setExporting(true);
    try {
      // Build query
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(display_name, username)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      // Apply date filters
      if (options.dateFrom) {
        query = query.gte('created_at', options.dateFrom);
      }
      if (options.dateTo) {
        query = query.lte('created_at', options.dateTo);
      }

      const { data: messages, error } = await query;

      if (error) throw error;

      if (!messages || messages.length === 0) {
        toast({
          title: 'No messages',
          description: 'No messages found for the selected date range',
        });
        return;
      }

      // Get conversation details if metadata is requested
      let conversationDetails = null;
      if (options.includeMetadata) {
        const { data: conv } = await supabase
          .from('conversations')
          .select(`
            *,
            creator:profiles!conversations_creator_id_fkey(display_name, username),
            customer:profiles!conversations_customer_id_fkey(display_name, username)
          `)
          .eq('id', conversationId)
          .single();
        conversationDetails = conv;
      }

      // Generate export file
      if (options.format === 'json') {
        downloadJSON(messages, conversationDetails, conversationId);
      } else {
        downloadTXT(messages, conversationDetails, conversationId);
      }

      toast({
        title: 'Export successful',
        description: `Exported ${messages.length} message(s)`,
      });
    } catch (error) {
      console.error('Error exporting conversation:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export conversation',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const downloadJSON = (messages: any[], conversationDetails: any, conversationId: string) => {
    const exportData = {
      conversationId,
      exportedAt: new Date().toISOString(),
      metadata: conversationDetails,
      messageCount: messages.length,
      messages: messages.map(msg => ({
        id: msg.id,
        sender: msg.sender?.display_name || 'Unknown',
        username: msg.sender?.username,
        content: msg.content,
        messageType: msg.message_type,
        timestamp: msg.created_at,
        edited: msg.edited_at ? true : false,
        editedAt: msg.edited_at,
        isPinned: msg.is_pinned,
        isForwarded: msg.is_forwarded,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversationId}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadTXT = (messages: any[], conversationDetails: any, conversationId: string) => {
    let content = '';

    if (conversationDetails) {
      content += '='.repeat(50) + '\n';
      content += 'CONVERSATION EXPORT\n';
      content += '='.repeat(50) + '\n\n';
      content += `Exported: ${format(new Date(), 'PPpp')}\n`;
      content += `Participants: ${conversationDetails.creator?.display_name} & ${conversationDetails.customer?.display_name}\n`;
      content += `Total Messages: ${messages.length}\n`;
      content += '\n' + '='.repeat(50) + '\n\n';
    }

    messages.forEach((msg, index) => {
      content += `[${format(new Date(msg.created_at), 'PPpp')}]\n`;
      content += `${msg.sender?.display_name || 'Unknown'}`;
      if (msg.edited_at) content += ' (edited)';
      if (msg.is_pinned) content += ' 📌';
      if (msg.is_forwarded) content += ' ↪️';
      content += ':\n';
      content += `${msg.content}\n`;
      if (msg.message_type === 'voice') {
        content += `[Voice Message - ${msg.voice_duration}s]\n`;
      }
      content += '\n';

      if (index < messages.length - 1) {
        content += '-'.repeat(50) + '\n\n';
      }
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversationId}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    exportConversation,
    exporting,
  };
};
