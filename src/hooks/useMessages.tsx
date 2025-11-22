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

      // Creator sending - no credit deduction
      if (!isCustomer) {
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
      }

      // Customer sending - implement hierarchical payment check
      if (!creatorId) throw new Error('Creator ID required');

      // Get creator's price per message
      const { data: creatorSettings } = await supabase
        .from('creator_settings')
        .select('price_per_message')
        .eq('user_id', creatorId)
        .single();

      const pricePerMessage = creatorSettings?.price_per_message || 5.00;

      // STEP 1: Check for active subscription with message allowance
      const { data: activeSubscription } = await supabase
        .from('creator_subscriptions')
        .select('*, subscription_tiers!inner(free_messages_per_month, unlimited_messages)')
        .eq('customer_id', user.id)
        .eq('status', 'active')
        .gte('current_period_end', new Date().toISOString())
        .maybeSingle();

      if (activeSubscription?.subscription_tiers) {
        const tierData = activeSubscription.subscription_tiers as any;
        const hasUnlimitedMessages = tierData.unlimited_messages === true;
        const freeMessagesPerMonth = tierData.free_messages_per_month || 0;

        if (hasUnlimitedMessages || freeMessagesPerMonth > 0) {
          // Check if messages remain in subscription
          const { count: usedMessages } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', user.id)
            .eq('is_paid', true)
            .gte('created_at', activeSubscription.current_period_start || new Date().toISOString());

          const remainingMessages = hasUnlimitedMessages ? 999 : (freeMessagesPerMonth - (usedMessages || 0));

          if (remainingMessages > 0) {
            // Use subscription message
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

            const successMessage = hasUnlimitedMessages 
              ? "Message sent (unlimited messages)" 
              : `Message sent (${remainingMessages - 1} subscription messages remaining)`;
            toast.success(successMessage);
            setSending(false);
            return messageData;
          }
        }
      }

      // STEP 2: Check for message bundle credits
      const { data: bundleCredits } = await supabase
        .from('customer_credits')
        .select('*')
        .eq('customer_id', user.id)
        .eq('creator_id', creatorId)
        .gt('credits_remaining', 0)
        .maybeSingle();

      if (bundleCredits && bundleCredits.credits_remaining > 0) {
        // Deduct bundle credit
        const { error: deductError } = await supabase
          .from('customer_credits')
          .update({ credits_remaining: bundleCredits.credits_remaining - 1 })
          .eq('id', bundleCredits.id);

        if (deductError) throw deductError;

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

        toast.success(`Message sent (${bundleCredits.credits_remaining - 1} bundle credits remaining)`);
        setSending(false);
        return messageData;
      }

      // STEP 3: Check for pay-per-message wallet balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      const currentBalance = parseFloat(String(profile?.wallet_balance || 0));

      if (currentBalance >= pricePerMessage) {
        const newBalance = currentBalance - pricePerMessage;

        // Update balance
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', user.id);

        if (balanceError) throw balanceError;

        // Record wallet transaction
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

      // STEP 4: Block message - no entitlements available
      toast.error("You need a subscription, message bundle, or credits to send messages. Please purchase one to continue.");
      setSending(false);
      return;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
      setSending(false);
      throw error;
    }
  };

  return { messages, loading, refetch: fetchMessages, sendMessage, sending };
};
