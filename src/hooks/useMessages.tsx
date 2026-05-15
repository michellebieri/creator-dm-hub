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
      .select(`*, unlockables (*)`)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      // Normalize `unlockables` to an array. PostgREST embeds it as an OBJECT
      // (not array) because messages.id → unlockables.message_id has a UNIQUE
      // constraint (1-to-1 relationship). The render code below expects
      // `msg.unlockables.length > 0 && msg.unlockables.map(...)` which silently
      // does nothing on an object. Without this normalization customers NEVER
      // see locked content cards.
      const normalized = (data || []).map(m => ({
        ...m,
        unlockables: Array.isArray(m.unlockables)
          ? m.unlockables
          : (m.unlockables ? [m.unlockables] : []),
      }));
      setMessages(normalized);
    }
    setLoading(false);
  };

  // READ-ONLY: never creates rows. Row creation happens lazily in sendMessage.
  const fetchSubscriptionInfo = async () => {
    if (!user || !creatorId) return;

    try {
      const { data: subscriptions } = await supabase
        .from('creator_subscriptions')
        .select('*, subscription_tiers!inner(*)')
        .eq('customer_id', user.id)
        .in('status', ['active', 'canceling'])
        .gte('current_period_end', new Date().toISOString());

      if (!subscriptions || subscriptions.length === 0) {
        setSubscriptionInfo(null);
        return;
      }

      const subscription = subscriptions.find(
        (sub: any) => sub.subscription_tiers?.creator_id === creatorId
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

      // Read only — never insert here
      const { data: usageRecord } = await supabase
        .from('subscription_message_usage')
        .select('messages_used, messages_allowed')
        .eq('subscription_id', subscription.id)
        .eq('period_start', subscription.current_period_start)
        .maybeSingle();

      const messagesUsed = usageRecord?.messages_used ?? 0;

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

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          // Realtime payload only contains the messages row — no embedded
          // unlockables. For unlockable messages we re-fetch so the locked
          // card renders correctly without requiring the user to refresh.
          // For text/voice we just append optimistically.
          if ((payload.new as any).message_type === 'unlockable') {
            fetchMessages();
          } else {
            setMessages((current) => {
              // Avoid duplicates if both INSERT realtime and our own send-RPC
              // returned at the same time.
              if (current.some(m => m.id === (payload.new as any).id)) return current;
              return [...current, payload.new as Message];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMessages((current) => current.map((msg) => msg.id === payload.new.id ? (payload.new as Message) : msg))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, creatorId]);

  const sendMessage = async (
    content: string,
    messageType: 'text' | 'voice' = 'text',
    voiceUrl?: string,
    voiceDuration?: number,
    // convOverride: when the caller has *just* created the conversation
    // (e.g. first-ever message between this customer ↔ creator), the
    // `conversationId` prop in this hook is still the stale null from the
    // closure — React's setConversationId hasn't propagated yet. Allowing the
    // caller to pass the just-created ID makes the first send work reliably.
    convOverride?: string
  ) => {
    const effectiveConvId = convOverride || conversationId;
    if (!user || !effectiveConvId) return;

    setSending(true);
    try {
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('creator_id, customer_id')
        .eq('id', effectiveConvId)
        .single();

      if (convError) throw convError;

      const isCustomer = conversation.customer_id === user.id;

      // ── Creator sends: free, no payment logic ──────────────────────────────
      if (!isCustomer) {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: effectiveConvId,
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
        setSending(false);
        return data;
      }

      if (!creatorId) throw new Error('Creator ID required');

      // ── STEP 1: Subscription messages ─────────────────────────────────────
      const { data: subscriptions } = await supabase
        .from('creator_subscriptions')
        .select('*, subscription_tiers!inner(*)')
        .eq('customer_id', user.id)
        .in('status', ['active', 'canceling'])
        .gte('current_period_end', new Date().toISOString());

      const activeSubscription = subscriptions?.find(
        (sub: any) => sub.subscription_tiers?.creator_id === creatorId
      );

      if (activeSubscription?.subscription_tiers) {
        const tierData = activeSubscription.subscription_tiers as any;
        const hasUnlimitedMessages = tierData.unlimited_messages === true;
        const freeMessagesPerMonth = tierData.free_messages_per_month || 0;

        if (hasUnlimitedMessages || freeMessagesPerMonth > 0) {
          // Get or lazily create usage record for this billing period
          let { data: usageRecord } = await supabase
            .from('subscription_message_usage')
            .select('*')
            .eq('subscription_id', activeSubscription.id)
            .eq('period_start', activeSubscription.current_period_start)
            .maybeSingle();

          if (!usageRecord) {
            const { data: newUsage } = await supabase
              .from('subscription_message_usage')
              .insert({
                subscription_id: activeSubscription.id,
                customer_id: user.id,
                creator_id: creatorId,
                period_start: activeSubscription.current_period_start,
                period_end: activeSubscription.current_period_end,
                messages_used: 0,
                messages_allowed: freeMessagesPerMonth,
              })
              .select()
              .single();
            usageRecord = newUsage;
          }

          if (usageRecord && (hasUnlimitedMessages || usageRecord.messages_used < usageRecord.messages_allowed)) {
            // Atomically increment usage + insert message in one DB transaction
            const { data: result, error: rpcError } = await supabase.rpc('use_subscription_message', {
              p_usage_record_id: usageRecord.id,
              p_conversation_id: effectiveConvId,
              p_sender_id: user.id,
              p_content: content,
              p_message_type: messageType,
              p_voice_url: voiceUrl || null,
              p_voice_duration: voiceDuration || null,
              p_is_unlimited: hasUnlimitedMessages,
              p_allowed: freeMessagesPerMonth,
            });

            const res = result as { success: boolean; message_id?: string; messages_used?: number; messages_allowed?: number; error?: string } | null;

            if (res?.success) {
              const remaining = hasUnlimitedMessages ? '∞' : Math.max(0, (res.messages_allowed ?? 0) - (res.messages_used ?? 0));
              toast.success(hasUnlimitedMessages
                ? 'Message sent (unlimited subscription)'
                : `Message sent (${remaining} free messages remaining this month)`
              );
              setSubscriptionInfo(prev => prev ? {
                ...prev,
                freeMessagesRemaining: hasUnlimitedMessages ? 999 : Number(remaining),
              } : null);
              // Trigger auto-reply check (fire-and-forget)
              supabase.functions.invoke('check-auto-reply', {
                body: { conversationId: effectiveConvId, senderId: user.id, recipientId: creatorId },
              }).catch(() => {});
              setSending(false);
              return { id: res.message_id };
            }
            // If error is "No free messages remaining", fall through to next tier
            if (res?.error && res.error !== 'No free messages remaining') {
              throw new Error(res.error);
            }
          }
        }
      }

      // ── STEP 2: Bundle credits (atomic: decrement + insert in one tx) ──────
      const { data: bundleResult, error: bundleError } = await supabase.rpc('send_bundle_message', {
        p_customer_id:     user.id,
        p_creator_id:      creatorId,
        p_conversation_id: effectiveConvId,
        p_content:         content,
        p_message_type:    messageType,
        p_voice_url:       voiceUrl || null,
        p_voice_duration:  voiceDuration || null,
      });

      const bundle = bundleResult as { success: boolean; message_id?: string; remaining?: number; error?: string } | null;

      if (bundle?.success) {
        toast.success(`Message sent (${bundle.remaining ?? 0} bundle credits remaining)`);
        // Trigger auto-reply check (fire-and-forget)
        supabase.functions.invoke('check-auto-reply', {
          body: { conversationId: effectiveConvId, senderId: user.id, recipientId: creatorId },
        }).catch(() => {});
        setSending(false);
        return { id: bundle.message_id };
      }

      // ── STEP 3: Wallet pay-per-message (atomic: deduct + insert + record) ──
      const { data: creatorSettings } = await supabase
        .from('creator_settings')
        .select('price_per_message, first_three_free')
        .eq('user_id', creatorId)
        .maybeSingle();

      const pricePerMessage = creatorSettings?.price_per_message || 5.00;

      // "First 3 messages free": delegated to send_first_three_free_message RPC.
      // The RPC runs SECURITY DEFINER, re-verifies the flag, and uses an advisory
      // lock to make the count+insert atomic against spam-click races.
      if (creatorSettings?.first_three_free) {
        const { data: freeResult } = await supabase.rpc('send_first_three_free_message', {
          p_conversation_id: effectiveConvId,
          p_sender_id:       user.id,
          p_creator_id:      creatorId,
          p_content:         content,
          p_message_type:    messageType,
          p_voice_url:       voiceUrl || null,
          p_voice_duration:  voiceDuration || null,
        });

        const free = freeResult as { success: boolean; message_id?: string; remaining?: number; error?: string } | null;

        if (free?.success) {
          const remaining = free.remaining ?? 0;
          toast.success(remaining > 0
            ? `Message sent free (${remaining} free message${remaining !== 1 ? 's' : ''} remaining)`
            : 'Message sent free (last free message used)'
          );
          supabase.functions.invoke('check-auto-reply', {
            body: { conversationId: effectiveConvId, senderId: user.id, recipientId: creatorId },
          }).catch(() => {});
          setSending(false);
          return { id: free.message_id };
        }
        // If the RPC says no free messages remaining (or any other non-success),
        // fall through to the paid wallet path below.
      }

      const { data: walletResult, error: walletError } = await supabase.rpc('send_paid_message', {
        p_conversation_id: effectiveConvId,
        p_sender_id:       user.id,
        p_creator_id:      creatorId,
        p_content:         content,
        p_message_type:    messageType,
        p_voice_url:       voiceUrl || null,
        p_voice_duration:  voiceDuration || null,
        p_price:           pricePerMessage,
      });

      const wallet = walletResult as { success: boolean; message_id?: string; new_balance?: number; error?: string } | null;

      if (wallet?.success) {
        // Push the new balance to any useWallet listener so the UI updates
        // immediately without waiting for realtime broadcasts (which require
        // `profiles` in the supabase_realtime publication — not guaranteed).
        if (typeof wallet.new_balance === 'number') {
          window.dispatchEvent(new CustomEvent('wallet-balance-update', {
            detail: { balance: wallet.new_balance }
          }));
        }

        // Also trigger auto-reply check (fire-and-forget)
        supabase.functions.invoke('check-auto-reply', {
          body: { conversationId: effectiveConvId, senderId: user.id, recipientId: creatorId },
        }).catch(() => {});

        toast.success('Message sent');
        setSending(false);
        return { id: wallet.message_id };
      }

      if (wallet?.error === 'Insufficient balance') {
        toast.error('Insufficient wallet balance. Please add funds.');
        setSending(false);
        return null;
      }

      // ── STEP 4: No entitlements ───────────────────────────────────────────
      toast.error('Send failed: ' + (walletError?.message || wallet?.error || 'unknown (no entitlements found)'));
      setSending(false);
      return null;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setSending(false);
      throw error;
    }
  };

  return { messages, loading, refetch: fetchMessages, sendMessage, sending, subscriptionInfo };
};
