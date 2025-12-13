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

interface SubscriptionMessageInfo {
  hasSubscription: boolean;
  hasUnlimitedMessages: boolean;
  freeMessagesRemaining: number;
  freeMessagesAllowed: number;
}

export const useMessages = (conversationId: string | null, creatorId?: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionMessageInfo | null>(null);

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

  const fetchSubscriptionInfo = async () => {
    if (!user || !creatorId) return;

    try {
      // Get active subscription for this creator
      const { data: subscriptions } = await supabase
        .from('creator_subscriptions')
        .select('*, subscription_tiers!inner(*)')
        .eq('customer_id', user.id)
        .eq('status', 'active')
        .gte('current_period_end', new Date().toISOString());

      if (!subscriptions || subscriptions.length === 0) {
        setSubscriptionInfo(null);
        return;
      }

      // Find subscription for this specific creator
      const subscription = subscriptions.find((sub: any) => 
        sub.subscription_tiers?.creator_id === creatorId
      );

      if (!subscription) {
        setSubscriptionInfo(null);
        return;
      }

      const tier = subscription.subscription_tiers as any;
      const hasUnlimitedMessages = tier.unlimited_messages === true;
      const freeMessagesAllowed = tier.free_messages_per_month || 0;

      if (!hasUnlimitedMessages && freeMessagesAllowed === 0) {
        setSubscriptionInfo({
          hasSubscription: true,
          hasUnlimitedMessages: false,
          freeMessagesRemaining: 0,
          freeMessagesAllowed: 0,
        });
        return;
      }

      // Get or create message usage record for current period
      const { data: existingUsage } = await supabase
        .from('subscription_message_usage')
        .select('*')
        .eq('subscription_id', subscription.id)
        .eq('period_start', subscription.current_period_start)
        .maybeSingle();

      let messagesUsed = 0;

      if (existingUsage) {
        messagesUsed = existingUsage.messages_used;
      } else {
        // Create new usage record for this period
        await supabase
          .from('subscription_message_usage')
          .insert({
            subscription_id: subscription.id,
            customer_id: user.id,
            creator_id: creatorId,
            period_start: subscription.current_period_start,
            period_end: subscription.current_period_end,
            messages_used: 0,
            messages_allowed: freeMessagesAllowed,
          });
      }

      setSubscriptionInfo({
        hasSubscription: true,
        hasUnlimitedMessages,
        freeMessagesRemaining: hasUnlimitedMessages ? 999 : Math.max(0, freeMessagesAllowed - messagesUsed),
        freeMessagesAllowed,
      });
    } catch (error) {
      console.error('Error fetching subscription info:', error);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchSubscriptionInfo();

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
  }, [conversationId, creatorId]);

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
      const { data: subscriptions } = await supabase
        .from('creator_subscriptions')
        .select('*, subscription_tiers!inner(*)')
        .eq('customer_id', user.id)
        .eq('status', 'active')
        .gte('current_period_end', new Date().toISOString());

      const activeSubscription = subscriptions?.find((sub: any) => 
        sub.subscription_tiers?.creator_id === creatorId
      );

      if (activeSubscription?.subscription_tiers) {
        const tierData = activeSubscription.subscription_tiers as any;
        const hasUnlimitedMessages = tierData.unlimited_messages === true;
        const freeMessagesPerMonth = tierData.free_messages_per_month || 0;

        if (hasUnlimitedMessages || freeMessagesPerMonth > 0) {
          // Get current period usage
          const { data: usageRecord } = await supabase
            .from('subscription_message_usage')
            .select('*')
            .eq('subscription_id', activeSubscription.id)
            .eq('period_start', activeSubscription.current_period_start)
            .maybeSingle();

          let messagesUsed = usageRecord?.messages_used || 0;
          const remainingMessages = hasUnlimitedMessages ? 999 : (freeMessagesPerMonth - messagesUsed);

          if (remainingMessages > 0) {
            // Use subscription message - update usage
            if (usageRecord) {
              await supabase
                .from('subscription_message_usage')
                .update({ 
                  messages_used: messagesUsed + 1,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', usageRecord.id);
            } else {
              // Create usage record if it doesn't exist
              await supabase
                .from('subscription_message_usage')
                .insert({
                  subscription_id: activeSubscription.id,
                  customer_id: user.id,
                  creator_id: creatorId,
                  period_start: activeSubscription.current_period_start,
                  period_end: activeSubscription.current_period_end,
                  messages_used: 1,
                  messages_allowed: freeMessagesPerMonth,
                });
            }

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

            const newRemaining = hasUnlimitedMessages ? '∞' : (remainingMessages - 1);
            const successMessage = hasUnlimitedMessages 
              ? "Message sent (unlimited subscription messages)" 
              : `Message sent (${newRemaining} free messages remaining this month)`;
            toast.success(successMessage);
            
            // Update local subscription info
            setSubscriptionInfo(prev => prev ? {
              ...prev,
              freeMessagesRemaining: hasUnlimitedMessages ? 999 : remainingMessages - 1,
            } : null);

            setSending(false);
            return messageData;
          }
        }
      }

      // STEP 2: Check for message bundle credits using atomic function
      const { data: bundleCreditResult, error: bundleError } = await supabase
        .rpc('spend_bundle_credit', {
          p_customer_id: user.id,
          p_creator_id: creatorId,
        });

      const bundleResult = bundleCreditResult as { success: boolean; remaining?: number; error?: string } | null;

      if (bundleResult?.success) {

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

        toast.success(`Message sent (${bundleResult.remaining ?? 0} bundle credits remaining)`);
        setSending(false);
        return messageData;
      }

      // STEP 3: Check for pay-per-message wallet balance using atomic database function
      const { data: spendResult, error: spendError } = await supabase
        .rpc('spend_wallet_balance', {
          p_user_id: user.id,
          p_amount: pricePerMessage,
          p_transaction_type: 'message',
          p_description: 'Message to creator',
          p_related_user_id: creatorId,
        });

      if (spendError) {
        console.error('Wallet spend error:', spendError);
        throw new Error('Failed to process payment');
      }

      // Cast the result to check success property
      const result = spendResult as { success: boolean; new_balance?: number; error?: string } | null;

      if (result?.success) {

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

  return { messages, loading, refetch: fetchMessages, sendMessage, sending, subscriptionInfo };
};
