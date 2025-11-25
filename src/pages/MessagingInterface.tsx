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
import { MessageReactions } from '@/components/MessageReactions';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { VoiceMessage } from '@/components/VoiceMessage';
import { MessageScheduler } from '@/components/MessageScheduler';
import { ScheduledMessagesList } from '@/components/ScheduledMessagesList';
import { MessageForward } from '@/components/MessageForward';
import { PinnedMessages } from '@/components/PinnedMessages';
import { MessagePinButton } from '@/components/MessagePinButton';
import { ConversationStats } from '@/components/ConversationStats';
import { MessageEditDialog } from '@/components/MessageEditDialog';
import { ConversationExport } from '@/components/ConversationExport';
import { MessageBookmarkButton } from '@/components/MessageBookmarkButton';
import { ReadReceiptIndicator } from '@/components/ReadReceiptIndicator';
import { MessageSearchDialog } from '@/components/MessageSearchDialog';

import { BulkContentUpload } from '@/components/BulkContentUpload';
import { AddFundsDialog } from '@/components/AddFundsDialog';
import { Send, ArrowLeft, AlertCircle, Search, Forward, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMessages } from '@/hooks/useMessages';
import { useWallet } from '@/hooks/useWallet';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useReadReceipts } from '@/hooks/useReadReceipts';
import { useScheduledMessages } from '@/hooks/useScheduledMessages';
import { usePinnedMessages } from '@/hooks/usePinnedMessages';

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
  const MAX_MESSAGE_LENGTH = 700;
  const [sending, setSending] = useState(false);
  const [packs, setPacks] = useState([]);
  const [isCreator, setIsCreator] = useState(false);
  const [pricePerMessage, setPricePerMessage] = useState(0);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string; created_at: string } | null>(null);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<{ display_name: string; avatar_url: string | null; username: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, loading: messagesLoading, refetch, sendMessage, sending: messageSending } = useMessages(conversationId, creatorId);
  const { balance, spend } = useWallet();
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(conversationId, user?.id || null);
  const { scheduleMessage } = useScheduledMessages(user?.id || null);
  const { pinMessage, unpinMessage } = usePinnedMessages(conversationId, user?.id || null);
  const { canEdit } = useMessageEdit();
  
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
      // Check if current user is a creator (by role)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const userIsCreator = profile?.role === 'creator';
      setIsCreator(userIsCreator);

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
      let conversation;
      
      if (userIsCreator) {
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
      if (!userIsCreator) {
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
  }, [creatorId, user]);

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
    const messageToSend = trimmedMessage;
    setMessage('');
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
        // If current user is creator, they are creator_id and the other user is customer_id
        // If current user is customer, they are customer_id and the other user is creator_id
        const conversationData = isCreator 
          ? { creator_id: user.id, customer_id: creatorId }
          : { customer_id: user.id, creator_id: creatorId };

        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert(conversationData)
          .select('id')
          .single();

        if (convError) throw convError;
        convId = newConv.id;
        setConversationId(convId);
      }

      // Send message using the hook (handles credit deduction)
      await sendMessage(messageToSend);

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
      // Create conversation if doesn't exist
      let convId = conversationId;
      if (!convId) {
        // If current user is creator, they are creator_id and the other user is customer_id
        const conversationData = isCreator 
          ? { creator_id: user.id, customer_id: creatorId }
          : { customer_id: user.id, creator_id: creatorId };

        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert(conversationData)
          .select('id')
          .single();

        if (convError) throw convError;
        convId = newConv.id;
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

      // Send voice message using the hook (handles credit deduction)
      await sendMessage('Voice message', 'voice', publicUrl, duration);

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
            {creatorProfile && !isCreator ? (
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
            {conversationId && user?.id && (
              <>
                <ConversationExport conversationId={conversationId} />
                <ConversationStats conversationId={conversationId} userId={user.id} />
              </>
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

          {conversationId && user?.id && (
            <PinnedMessages
              conversationId={conversationId}
              userId={user.id}
              onUnpin={unpinMessage}
            />
          )}
          
          <div className="space-y-4">
            {messagesLoading ? (
              <Card className="p-4">
                <p className="text-muted-foreground text-center">Loading messages...</p>
              </Card>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                {creatorProfile && !isCreator ? (
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
                     <div className="flex items-center gap-2 flex-wrap">
                       <MessageReactions messageId={msg.id} userId={user?.id || null} />
                       {user?.id && (
                         <>
                           <MessageBookmarkButton messageId={msg.id} userId={user.id} />
                           {msg.sender_id === user.id && 
                            msg.message_type !== 'voice' && 
                            canEdit(msg.created_at, msg.sender_id, user.id) && (
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
                           )}
                           <MessagePinButton
                             isPinned={msg.is_pinned || false}
                             onPin={() => pinMessage(msg.id)}
                             onUnpin={() => unpinMessage(msg.id)}
                           />
                           <MessageForward
                             messageId={msg.id}
                             messageContent={msg.content}
                             currentUserId={user.id}
                           />
                         </>
                       )}
                     </div>
                  </div>
                  {msg.sender_id === user?.id && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>Y</AvatarFallback>
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
              <BulkContentUpload
                conversationId={conversationId}
                creatorId={user?.id || ''}
                onSuccess={refetch}
              />
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
            <VoiceRecorder 
              onSendVoice={handleSendVoice}
              disabled={sending || (balance < pricePerMessage && !isCreator)}
            />
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
              <div className={`text-xs text-right ${message.length >= MAX_MESSAGE_LENGTH - 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {message.length}/{MAX_MESSAGE_LENGTH}
              </div>
            </div>
            <Button 
              onClick={handleSend} 
              disabled={sending || messageSending || !message.trim() || (balance < pricePerMessage && !isCreator)}
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
