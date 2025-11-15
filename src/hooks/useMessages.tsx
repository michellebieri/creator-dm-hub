import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_paid: boolean;
  message_type?: string;
  voice_url?: string | null;
  voice_duration?: number | null;
  is_forwarded?: boolean;
  forwarded_from_id?: string | null;
  is_pinned?: boolean;
  pinned_at?: string | null;
  pinned_by?: string | null;
  read_at?: string | null;
  read_by?: string | null;
  edited_at?: string | null;
  edit_count?: number;
  unlockables?: any;
}

export const useMessages = (conversationId: string | null, creatorId?: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        unlockables (*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    // Subscribe to new messages and updates
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((current) => [...current, payload.new as Message]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((current) =>
            current.map((msg) =>
              msg.id === payload.new.id ? (payload.new as Message) : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = async (
    content: string,
    messageType: 'text' | 'voice' = 'text',
    voiceUrl?: string,
    voiceDuration?: number
  ) => {
    if (!user || !conversationId) return;

    setSending(true);
    try {
      // Get conversation details to check role
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('creator_id, customer_id')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      const isCustomer = conversation.customer_id === user.id;

      // If customer is sending, deduct from wallet
      if (isCustomer && creatorId) {
        // Get creator's price per message
        const { data: creatorSettings } = await supabase
          .from('creator_settings')
          .select('price_per_message')
          .eq('user_id', creatorId)
          .single();

        const pricePerMessage = creatorSettings?.price_per_message || 5.00;

        // Get user's wallet balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', user.id)
          .single();

        const currentBalance = parseFloat(String(profile?.wallet_balance || 0));

        if (currentBalance < pricePerMessage) {
          toast.error("Insufficient balance. Please add funds to your wallet.");
          setSending(false);
          return;
        }

        const newBalance = currentBalance - pricePerMessage;

        // Update balance
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', user.id);

        if (balanceError) {
          toast.error("Failed to process payment. Please try again.");
          setSending(false);
          return;
        }

        // Record transaction
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            amount: -pricePerMessage,
            transaction_type: 'message',
            description: `Message to creator`,
            related_user_id: creatorId,
            balance_after: newBalance,
          });

        // Send message
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content,
            message_type: messageType,
            voice_url: voiceUrl,
            voice_duration: voiceDuration,
            is_paid: true,
          })
          .select()
          .single();

        if (messageError) throw messageError;

        // Record transaction
        await supabase
          .from('transactions')
          .insert({
            customer_id: user.id,
            creator_id: creatorId,
            message_id: messageData.id,
            amount: pricePerMessage,
            net_amount: pricePerMessage * 0.85,
            platform_fee: pricePerMessage * 0.15,
            processor_fee: 0,
            transaction_type: 'message',
            status: 'completed',
          });

        // Check for auto-reply from creator
        try {
          await supabase.functions.invoke('check-auto-reply', {
            body: {
              conversationId,
              senderId: user.id,
              recipientId: creatorId,
            },
          });
        } catch (autoReplyError) {
          console.error('Auto-reply check failed:', autoReplyError);
        }

        toast.success("Message sent");
        setSending(false);
        return messageData;
      }

      // Creator sending - no credit deduction
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          message_type: messageType,
          voice_url: voiceUrl,
          voice_duration: voiceDuration,
          is_paid: false,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Message sent");
      setSending(false);
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
      setSending(false);
      throw error;
    }
  };

  return { messages, loading, refetch: fetchMessages, sendMessage, sending };
};
