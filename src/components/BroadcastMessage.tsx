import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Radio, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const BroadcastMessage = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);

  const loadRecipientCount = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('customer_id', { count: 'exact' })
        .eq('creator_id', user.id);

      if (error) throw error;
      const uniqueCustomers = new Set(data?.map(c => c.customer_id)).size;
      setRecipientCount(uniqueCustomers);
    } catch (error) {
      console.error('Error loading recipient count:', error);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      loadRecipientCount();
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !user) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      // Get all unique customers
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('customer_id, id')
        .eq('creator_id', user.id);

      if (convError) throw convError;

      // Send message to each conversation
      const uniqueConversations = Array.from(
        new Map(conversations?.map(c => [c.customer_id, c.id]) || []).values()
      );

      const messages = uniqueConversations.map(convId => ({
        conversation_id: convId,
        sender_id: user.id,
        content: message,
        message_type: 'text' as const,
        is_paid: false,
      }));

      const { error: sendError } = await supabase
        .from('messages')
        .insert(messages);

      if (sendError) throw sendError;

      toast.success(`Broadcast sent to ${uniqueConversations.length} customers!`);
      setMessage('');
      setOpen(false);
    } catch (error: any) {
      console.error('Error sending broadcast:', error);
      toast.error(error.message || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Radio className="h-4 w-4 mr-2" />
          Broadcast Message
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Broadcast Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your broadcast message..."
              rows={6}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground mt-2">
              This message will be sent to {recipientCount} customers
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">💡 Tips for effective broadcasts:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Keep messages personal and engaging</li>
              <li>Include a clear call-to-action</li>
              <li>Avoid sending too frequently</li>
              <li>Consider timing (when are your fans most active?)</li>
            </ul>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || !message.trim()}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Broadcast'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
