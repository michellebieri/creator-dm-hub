import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Forward, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MessageForwardProps {
  messageId: string;
  messageContent: string;
  currentUserId: string;
}

interface Conversation {
  id: string;
  creator_id: string;
  customer_id: string;
  creator?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  customer?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export const MessageForward = ({ messageId, messageContent, currentUserId }: MessageForwardProps) => {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchConversations();
    }
  }, [open]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          creator:profiles!conversations_creator_id_fkey(*),
          customer:profiles!conversations_customer_id_fkey(*)
        `)
        .or(`creator_id.eq.${currentUserId},customer_id.eq.${currentUserId}`)
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForward = async (conversationId: string) => {
    setForwarding(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: messageContent,
          is_forwarded: true,
          forwarded_from_id: messageId,
          is_paid: true,
        });

      if (error) throw error;

      toast({
        title: 'Message forwarded',
        description: 'Message has been forwarded successfully',
      });

      setOpen(false);
    } catch (error: any) {
      console.error('Error forwarding message:', error);
      toast({
        title: 'Error',
        description: 'Failed to forward message',
        variant: 'destructive',
      });
    } finally {
      setForwarding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <Forward className="h-3 w-3 mr-1" />
          Forward
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px] pr-4">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No conversations available
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => {
                const otherUser = currentUserId === conv.creator_id 
                  ? conv.customer 
                  : conv.creator;

                return (
                  <Button
                    key={conv.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3"
                    onClick={() => handleForward(conv.id)}
                    disabled={forwarding}
                  >
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={otherUser?.avatar_url} />
                      <AvatarFallback>
                        {otherUser?.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{otherUser?.display_name}</p>
                    </div>
                    {forwarding && <Check className="h-4 w-4 ml-2" />}
                  </Button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
