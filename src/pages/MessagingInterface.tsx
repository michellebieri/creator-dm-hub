import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UnlockableContent } from '@/components/UnlockableContent';
import { UnlockableUpload } from '@/components/UnlockableUpload';
import { MessageTemplateSelector } from '@/components/MessageTemplateSelector';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { VoiceMessage } from '@/components/VoiceMessage';
import { MessageScheduler } from '@/components/MessageScheduler';
import { ScheduledMessagesList } from '@/components/ScheduledMessagesList';
import { ConversationStats } from '@/components/ConversationStats';
import { MessageEditDialog } from '@/components/MessageEditDialog';
import { ReadReceiptIndicator } from '@/components/ReadReceiptIndicator';
import { MessageSearchDialog } from '@/components/MessageSearchDialog';
import { PaymentRequiredOverlay } from '@/components/PaymentRequiredOverlay';
import { SubscriptionTiersDisplay } from '@/components/SubscriptionTiersDisplay';

import { AddFundsDialog } from '@/components/AddFundsDialog';
import { Send, ArrowLeft, AlertCircle, Search, Forward, Pencil, Heart, Bot, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMessages } from '@/hooks/useMessages';
import { useWallet } from '@/hooks/useWallet';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useReadReceipts } from '@/hooks/useReadReceipts';
import { useScheduledMessages } from '@/hooks/useScheduledMessages';
import { useSubscription } from '@/hooks/useSubscription';
import { useCredits } from '@/hooks/useCredits';

import { useMessageEdit } from '@/hooks/useMessageEdit';

const MessagingInterface = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const creatorId = searchParams.get('creator');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX_MESSAGE_LENGTH = 350;
  const [sending, setSending] = useState(false);
  const [packs, setPacks] = useState([]);
  const [pricePerMessage, setPricePerMessage] = useState(0);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string; created_at: string } | null>(null);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [aiDrafts, setAiDrafts] = useState<{ id: string; draft_content: string }[]>([]);
  const [showAiDrafts, setShowAiDrafts] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [showTipInput, setShowTipInput] = useState(false);
  const [customTip, setCustomTip] = useState('');
  const TIP_PRESETS = [1, 3, 5, 10];
  const [creatorProfile, setCreatorProfile] = useState<{ display_name: string; avatar_url: string | null; username: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { isCreator } = useRoleCheck();
  const { messages, loading: messagesLoading, refetch, sendMessage, sending: messageSending } = useMessages(conversationId, creatorId);
  const { balance, spend } = useWallet();
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(conversationId, user?.id || null);
  const { scheduleMessage } = useScheduledMessages(user?.id || null);
  const { canEdit } = useMessageEdit();
  const { isSubscribed } = useSubscription(user?.id, creatorId);
  const { credits } = useCredits(creatorId);
  
  // Check if user needs to pay - only for non-creators without subscription, credits, or balance
  const needsPayment = !isCreator && !isSubscribed && credits <= 0 && balance < pricePerMessage && pricePerMessage > 0;
  
  // Find the user's last sent message ID for edit button visibility
  const userLastMessageId = messages
    .filter(msg => msg.sender_id === user?.id && msg.message_type !== 'voice')
    .slice(-1)[0]?.id || null;
  
  // Mark messages as read when viewing conversation
  useReadReceipts(conversationId, user?.id || null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    
    const fetchUserProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setUserDisplayName(data.display_name);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (!creatorId || !user) return;

    const fetchData = async () => {
      // Fetch the other user's profile info (the person we're chatting with)
      const { data: otherUserData } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, username')
        .eq('id', creatorId)
        .single();

      if (otherUserData) {
        setCreatorProfile(otherUserData);
      }

      // Fetch or find conversation based on who the current user is
      // isCreator comes from useRoleCheck (reads user_roles table — authoritative)
      let conversation;

      if (isCreator) {
        // If current user is creator, the creatorId param is actually the customer
        // Look for conversation where current user is creator and creatorId is customer
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('creator_id', user.id)
          .eq('customer_id', creatorId)
          .maybeSingle();
        conversation = conv;
      } else {
        // Current user is a customer messaging a creator
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('customer_id', user.id)
          .eq('creator_id', creatorId)
          .maybeSingle();
        conversation = conv;
      }

      if (conversation) {
        setConversationId(conversation.id);
      }

      // Only fetch packs and pricing if current user is NOT a creator (they need to pay)
      if (!isCreator) {
        // Fetch packs for the creator
        const { data: packsData } = await supabase
          .from('message_packs')
          .select('*')
          .eq('creator_id', creatorId)
          .eq('is_active', true);

        setPacks(packsData || []);

        // Fetch creator's price per message
        const { data: creatorSettings } = await supabase
          .from('creator_settings')
          .select('price_per_message')
          .eq('user_id', creatorId)
          .single();

        setPricePerMessage(creatorSettings?.price_per_message || 0);
      } else {
        // Creators don't pay, so set price to 0
        setPricePerMessage(0);
        setPacks([]);
      }
    };

    fetchData();
  }, [creatorId, user, isCreator]);

  // Fetch pending AI drafts for creators
  useEffect(() => {
    if (!isCreator || !user || !conversationId) return;
    const fetchDrafts = async () => {
      const { data } = await supabase
        .from('ai_draft_messages')
        .select('id, draft_content')
        .eq('creator_id', user.id)
        .eq('conversation_id', conversationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      setAiDrafts(data || []);
    };
    fetchDrafts();

    const channel = supabase
      .channel(`ai-drafts-${conversationId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'ai_draft_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => fetchDrafts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isCreator, user, conversationId]);

  const handleSendAiDraft = async (draft: { id: string; draft_content: string }) => {
    if (!conversationId || !user) return;
    await sendMessage(draft.draft_content);
    await supabase.from('ai_draft_messages').update({ status: 'sent' }).eq('id', draft.id);
    setAiDrafts(prev => prev.filter(d => d.id !== draft.id));
  };

  const handleDismissAiDraft = async (draftId: string) => {
    await supabase.from('ai_draft_messages').update({ status: 'dismissed' }).eq('id', draftId);
    setAiDrafts(prev => prev.filter(d => d.id !== draftId));
  };

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    
    // Guard against duplicate sends and empty messages
    if (!trimmedMessage || !creatorId || !user || sending || messageSending) return;

    // Creators don't need balance to send messages
    if (!isCreator && balance < pricePerMessage) {
      setShowAddFunds(true);
      return;
    }

    // Clear message immediately to prevent duplicates
    const activeTip = tipAmount;
    const messageToSend = activeTip > 0
      ? `${trimmedMessage}\n💝 +$${activeTip.toFixed(2)} tip`
      : trimmedMessage;
    setMessage('');
    setTipAmount(0);
    setCustomTip('');
    setShowTipInput(false);
    stopTyping();
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setSending(true);
    try {
      // Create conversation if doesn't exist
      let convId = conversationId;
      if (!convId) {
        // Customers can INSERT new conversations but lack UPDATE permission,
        // so we can't use upsert (which requires both via ON CONFLICT DO UPDATE).
        // Instead: SELECT first, INSERT if missing, fall back to SELECT on the
        // rare unique-violation race (two simultaneous first-clicks).
        const otherUserId = creatorId!;
        const conversationData = isCreator
          ? { creator_id: user.id, customer_id: otherUserId }
          : { customer_id: user.id, creator_id: otherUserId };

        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('creator_id', conversationData.creator_id)
          .eq('customer_id', conversationData.customer_id)
          .maybeSingle();

        if (existing) {
          convId = existing.id;
        } else {
          const { data: inserted, error: insertErr } = await supabase
            .from('conversations')
            .insert(conversationData)
            .select('id')
            .single();
          if (insertErr) {
            if ((insertErr as { code?: string }).code === '23505') {
              // race: another tab/click won the insert — re-fetch
              const { data: raceWin } = await supabase
                .from('conversations')
                .select('id')
                .eq('creator_id', conversationData.creator_id)
                .eq('customer_id', conversationData.customer_id)
                .single();
              convId = raceWin?.id;
            } else {
              throw insertErr;
            }
          } else {
            convId = inserted.id;
          }
        }
        if (!convId) throw new Error('Failed to create or fetch conversation');
        setConversationId(convId);
      }

      // Deduct tip BEFORE sending so the tip text in the message is always backed by payment.
      // If spend fails, we throw and the message is never sent.
      if (activeTip > 0 && !isCreator) {
        const tipSuccess = await spend(activeTip, 'tip', `Tip to creator ${creatorId}`, creatorId);
        if (!tipSuccess) {
          // Restore message for retry
          setMessage(messageToSend);
          setSending(false);
          return;
        }
        // Record creator earnings for the tip
        await supabase.rpc('insert_completed_transaction', {
          p_creator_id: creatorId,
          p_amount: activeTip,
          p_transaction_type: 'message',
        });
      }

      // Send message using the hook (handles credit/wallet deduction).
      // Pass convId explicitly because setConversationId(convId) above is async —
      // the hook's `conversationId` closure is still the stale null when we get
      // here on the FIRST send (brand new conversation just created). Without
      // the override, the first message between any customer/creator pair
      // silently fails (sendMessage early-bails on null conversationId).
      await sendMessage(messageToSend, 'text', undefined, undefined, convId);

      // Send notification to recipient (the other user = creatorId param)
      const recipientId = creatorId;
      
      if (recipientId) {
        // Send email notification
        supabase.functions.invoke('send-notification', {
          body: {
            type: 'new_message',
            recipientId,
            senderName: user.user_metadata?.display_name || 'Someone',
            messagePreview: messageToSend.substring(0, 100),
          },
        }).catch(err => console.log('Email notification error:', err));

        // Create in-app notification
        supabase.functions.invoke('create-notification', {
          body: {
            userId: recipientId,
            type: 'new_message',
            title: 'New Message',
            message: `${user.user_metadata?.display_name || 'Someone'} sent you a message`,
            link: '/messages',
          },
        }).catch(err => console.log('In-app notification error:', err));
      }
    } catch (error: any) {
      // Restore message on error
      setMessage(messageToSend);
      toast({
        title: "Failed to send",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendVoice = async (audioBlob: Blob, duration: number) => {
    if (!creatorId || !user) return;

    // Creators don't need balance to send messages
    if (!isCreator && balance < pricePerMessage) {
      setShowAddFunds(true);
      return;
    }

    setSending(true);
    try {
      // Create conversation if doesn't exist (upsert prevents duplicate on double-tap)
      let convId = conversationId;
      if (!convId) {
        // SELECT-then-INSERT pattern (see handleSend for explanation):
        // customers lack UPDATE permission on conversations, so upsert fails.
        const otherUserId = creatorId!;
        const conversationData = isCreator
          ? { creator_id: user.id, customer_id: otherUserId }
          : { customer_id: user.id, creator_id: otherUserId };

        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('creator_id', conversationData.creator_id)
          .eq('customer_id', conversationData.customer_id)
          .maybeSingle();

        if (existing) {
          convId = existing.id;
        } else {
          const { data: inserted, error: insertErr } = await supabase
            .from('conversations')
            .insert(conversationData)
            .select('id')
            .single();
          if (insertErr) {
            if ((insertErr as { code?: string }).code === '23505') {
              const { data: raceWin } = await supabase
                .from('conversations')
                .select('id')
                .eq('creator_id', conversationData.creator_id)
                .eq('customer_id', conversationData.customer_id)
                .single();
              convId = raceWin?.id;
            } else {
              throw insertErr;
            }
          } else {
            convId = inserted.id;
          }
        }
        if (!convId) throw new Error('Failed to create or fetch conversation');
        setConversationId(convId);
      }

      // Upload audio file to storage
      const fileName = `${convId}/${Date.now()}.webm`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('unlockables')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('unlockables')
        .getPublicUrl(fileName);

      // Send voice message using the hook (handles credit deduction).
      // Pass convId explicitly — same async-state reason as handleSend above.
      await sendMessage('Voice message', 'voice', publicUrl, duration, convId);

      // Send notification to recipient (the other user = creatorId param)
      const recipientId = creatorId;
      
      if (recipientId) {
        supabase.functions.invoke('send-notification', {
          body: {
            type: 'new_message',
            recipientId,
            senderName: user.user_metadata?.display_name || 'Someone',
            messagePreview: '🎤 Voice message',
          },
        }).catch(err => console.log('Notification error:', err));
      }
    } catch (error: any) {
      toast({
        title: "Failed to send voice message",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleScheduleMessage = async (scheduledAt: Date) => {
    if (!message.trim() || !conversationId || !user || !isCreator) return;

    const success = await scheduleMessage(
      conversationId,
      message,
      scheduledAt
    );

    if (success) {
      setMessage('');
    }
  };

  const scrollToMessage = (messageId: string) => {
    setHighlightedMessageId(messageId);
    setTimeout(() => {
      const element = document.getElementById(`message-${messageId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }, 100);
  };

  if (loading) return null;
  return (
    <div className="h-[calc(100dvh-3.5rem-5rem)] flex flex-col bg-background overflow-hidden">
      <header className="border-b bg-card px-4 py-3 shrink-0 z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {creatorProfile ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {creatorProfile.avatar_url && (
                    <img src={creatorProfile.avatar_url} alt={creatorProfile.display_name} className="h-full w-full object-cover" />
                  )}
                  <AvatarFallback>{creatorProfile.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{creatorProfile.display_name}</h2>
                  <p className="text-xs text-muted-foreground">@{creatorProfile.username}</p>
                </div>
              </div>
            ) : (
              <h2 className="font-semibold">Messages</h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isCreator && creatorId && creatorProfile && (
              <SubscriptionTiersDisplay
                creatorId={creatorId}
                creatorName={creatorProfile.display_name}
              />
            )}
            {isCreator && conversationId && user?.id && (
              <ConversationStats conversationId={conversationId} userId={user.id} />
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearchDialog(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {isCreator && user?.id && (
            <ScheduledMessagesList senderId={user.id} />
          )}

          {/* AI Draft review banner — only for creators with pending drafts */}
          {isCreator && aiDrafts.length > 0 && (
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 overflow-hidden">
              <button
                onClick={() => setShowAiDrafts(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-violet-500/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-violet-500" />
                  <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                    {aiDrafts.length} AI draft{aiDrafts.length > 1 ? 's' : ''} waiting for your approval
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{showAiDrafts ? 'Hide' : 'Review'}</span>
              </button>
              {showAiDrafts && (
                <div className="px-4 pb-3 space-y-2">
                  {aiDrafts.map(draft => (
                    <div key={draft.id} className="bg-background rounded-lg p-3 border border-border">
                      <p className="text-sm mb-3 whitespace-pre-wrap">{draft.draft_content}</p>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => handleDismissAiDraft(draft.id)}
                        >
                          <X className="h-3 w-3 mr-1" />Dismiss
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-violet-600 hover:bg-violet-700"
                          onClick={() => handleSendAiDraft(draft)}
                        >
                          <Check className="h-3 w-3 mr-1" />Send
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payment Required Overlay - Show at top for customers without subscription/credits/balance */}
          {!isCreator && creatorProfile && (
            <PaymentRequiredOverlay
              creatorId={creatorId!}
              creatorProfile={creatorProfile}
              pricePerMessage={pricePerMessage}
              packs={packs}
              onSubscribed={() => {
                refetch();
              }}
            />
          )}
          
          <div className="space-y-4">
            {messagesLoading ? (
              <Card className="p-4">
                <p className="text-muted-foreground text-center">Loading messages...</p>
              </Card>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                {/* Show normal empty state only for creators or if user has payment access */}
                {(isCreator || (isSubscribed || credits > 0 || balance >= pricePerMessage || pricePerMessage === 0)) && (
                  creatorProfile && !isCreator ? (
                    <>
                      <Avatar className="h-20 w-20 mb-4">
                        {creatorProfile.avatar_url && (
                          <img src={creatorProfile.avatar_url} alt={creatorProfile.display_name} className="h-full w-full object-cover" />
                        )}
                        <AvatarFallback className="text-2xl">{creatorProfile.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold text-lg mb-1">Chat with {creatorProfile.display_name}</h3>
                      <p className="text-muted-foreground text-sm mb-2">
                        Type your message below to start the conversation
                      </p>
                      {pricePerMessage > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ${pricePerMessage.toFixed(2)} per message • Balance: ${balance.toFixed(2)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      No messages yet. Send your first message!
                    </p>
                  )
                )}
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  id={`message-${msg.id}`}
                  className={`flex gap-3 ${
                    msg.sender_id === user?.id ? 'justify-end' : ''
                  } ${highlightedMessageId === msg.id ? 'bg-accent/20 rounded-lg p-2 transition-colors' : ''}`}
                >
                  {msg.sender_id !== user?.id && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      {creatorProfile?.avatar_url && (
                        <img src={creatorProfile.avatar_url} alt="" className="h-full w-full object-cover" />
                      )}
                      <AvatarFallback>{creatorProfile?.display_name?.charAt(0).toUpperCase() || 'C'}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="space-y-2 max-w-md">
                    {msg.message_type === 'voice' && msg.voice_url ? (
                      <VoiceMessage 
                        voiceUrl={msg.voice_url}
                        duration={msg.voice_duration || 0}
                        isSender={msg.sender_id === user?.id}
                      />
                    ) : (
                      <Card
                        className={`p-3 ${
                          msg.sender_id === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : ''
                        }`}
                      >
                        {msg.is_forwarded && (
                          <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
                            <Forward className="h-3 w-3" />
                            <span>Forwarded</span>
                          </div>
                        )}
                         <p className="text-sm">{msg.content}</p>
                         <div className="flex items-center justify-between mt-1">
                           <div className="flex items-center gap-2">
                             <p className="text-xs opacity-70">
                               {new Date(msg.created_at).toLocaleTimeString()}
                             </p>
                             {msg.edited_at && (
                               <span className="text-xs opacity-70 italic">(edited)</span>
                             )}
                           </div>
                           <ReadReceiptIndicator 
                             readAt={msg.read_at}
                             isSender={msg.sender_id === user?.id}
                           />
                         </div>
                      </Card>
                    )}
                    {msg.unlockables && msg.unlockables.length > 0 && (
                      <div className="space-y-2">
                        {msg.unlockables.map((unlockable) => (
                          <UnlockableContent key={unlockable.id} unlockable={unlockable} />
                        ))}
                      </div>
                    )}
                     {/* Edit button - only shown on sender's last message */}
                     {user?.id && 
                      msg.id === userLastMessageId && 
                      msg.sender_id === user.id && 
                      canEdit(msg.created_at, msg.sender_id, user.id) && (
                       <div className="flex items-center gap-2 mt-1">
                         <Button
                           variant="ghost"
                           size="sm"
                           className="h-7 px-2 text-xs"
                           onClick={() => setEditingMessage({ 
                             id: msg.id, 
                             content: msg.content, 
                             created_at: msg.created_at 
                           })}
                         >
                           <Pencil className="h-3 w-3 mr-1" />
                           Edit
                         </Button>
                       </div>
                     )}
                  </div>
                  {msg.sender_id === user?.id && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {(user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
          </div>

          {typingUsers.length > 0 && (
            <div className="mt-4 px-3 py-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                {typingUsers.map(u => u.displayName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t bg-card px-4 py-3 shrink-0">
        <div className="max-w-4xl mx-auto">
          {/* Tip selector — fan-only, only when creator has a price */}
          {!isCreator && pricePerMessage > 0 && (
            <div className="mb-2">
              {!showTipInput ? (
                <button
                  onClick={() => setShowTipInput(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-pink-500 transition-colors"
                >
                  <Heart className="h-3.5 w-3.5" />
                  Add a tip
                  {tipAmount > 0 && (
                    <span className="ml-1 bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400 rounded-full px-2 py-0.5 font-medium">
                      +${tipAmount.toFixed(2)}
                    </span>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <Heart className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                  {TIP_PRESETS.map(p => (
                    <button
                      key={p}
                      onClick={() => { setTipAmount(p); setCustomTip(''); }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        tipAmount === p
                          ? 'bg-pink-500 text-white border-pink-500'
                          : 'border-border text-muted-foreground hover:border-pink-400 hover:text-pink-500'
                      }`}
                    >
                      ${p}
                    </button>
                  ))}
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Custom"
                      value={customTip}
                      onChange={(e) => {
                        setCustomTip(e.target.value);
                        const v = parseFloat(e.target.value);
                        setTipAmount(isNaN(v) ? 0 : v);
                      }}
                      className="w-20 h-7 pl-5 pr-1 text-xs"
                    />
                  </div>
                  {tipAmount > 0 && (
                    <button
                      onClick={() => { setTipAmount(0); setCustomTip(''); setShowTipInput(false); }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Insufficient balance warning */}
          {creatorId && !isCreator && balance < pricePerMessage && (
            <div className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">
                    Add funds to send messages (${pricePerMessage.toFixed(2)}/msg)
                  </span>
                </div>
                <Button size="sm" onClick={() => setShowAddFunds(true)}>
                  Add Funds
                </Button>
              </div>
            </div>
          )}
          
          {isCreator && conversationId && (
            <div className="mb-3 flex justify-end gap-2">
              <UnlockableUpload
                conversationId={conversationId}
                creatorId={user?.id || ''}
                onSuccess={refetch}
              />
              {/* Bulk Upload removed from chat UI — not production-ready, caused UX confusion.
                  Component file kept in repo in case it's re-enabled behind a feature flag later. */}
            </div>
          )}
          <div className="flex gap-2 items-center">
            {isCreator && user?.id && (
              <MessageTemplateSelector
                creatorId={user.id}
                onSelectTemplate={(content) => {
                  setMessage(content);
                }}
              />
            )}
            {isCreator && conversationId && (
              <MessageScheduler
                onSchedule={handleScheduleMessage}
                disabled={sending || !message.trim()}
              />
            )}
            {isCreator && (
              <VoiceRecorder
                onSendVoice={handleSendVoice}
                disabled={sending}
              />
            )}
            <div className="flex-1 flex flex-col gap-1">
              <Textarea
                ref={textareaRef}
                placeholder="Type a message..."
                value={message}
                maxLength={MAX_MESSAGE_LENGTH}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setMessage(newValue);
                  if (newValue && userDisplayName) {
                    startTyping(userDisplayName);
                  } else {
                    stopTyping();
                  }
                  // Auto-resize textarea
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    const scrollHeight = textareaRef.current.scrollHeight;
                    const maxHeight = 200; // ~8 lines
                    textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                    // Reset textarea height after sending
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto';
                    }
                  }
                }}
                onBlur={() => stopTyping()}
                disabled={sending || messageSending}
                className="min-h-[40px] max-h-[200px] resize-none bg-background text-foreground placeholder:text-muted-foreground overflow-y-auto"
                rows={1}
              />
              {message.length > 0 && (
                <div className={`text-xs text-right ${message.length >= MAX_MESSAGE_LENGTH - 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {message.length}/{MAX_MESSAGE_LENGTH}
                </div>
              )}
            </div>
            <Button
              onClick={handleSend}
              disabled={sending || messageSending || !message.trim() || (balance < (pricePerMessage + tipAmount) && !isCreator)}
              size="icon"
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {editingMessage && (
        <MessageEditDialog
          open={!!editingMessage}
          onOpenChange={(open) => !open && setEditingMessage(null)}
          messageId={editingMessage.id}
          currentContent={editingMessage.content}
          createdAt={editingMessage.created_at}
          onSuccess={refetch}
        />
      )}

      <MessageSearchDialog
        open={showSearchDialog}
        onOpenChange={setShowSearchDialog}
        messages={messages}
        onSelectMessage={scrollToMessage}
      />

      <AddFundsDialog
        open={showAddFunds}
        onOpenChange={setShowAddFunds}
        requiredAmount={pricePerMessage}
        currentBalance={balance}
        onSuccess={(newBalance) => {
          setShowAddFunds(false);
          toast({
            title: "Success!",
            description: `Your wallet balance is now $${newBalance.toFixed(2)}. You can now send messages.`,
          });
        }}
      />
    </div>
  );
};

export default MessagingInterface;
