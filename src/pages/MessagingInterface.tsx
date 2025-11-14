import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessagePackPurchase } from '@/components/MessagePackPurchase';
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
import { Send, ArrowLeft, AlertCircle, Search, Check, CheckCheck, Forward, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMessages } from '@/hooks/useMessages';
import { useCredits } from '@/hooks/useCredits';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useReadReceipts } from '@/hooks/useReadReceipts';
import { useScheduledMessages } from '@/hooks/useScheduledMessages';
import { usePinnedMessages } from '@/hooks/usePinnedMessages';
import { useMessageDrafts } from '@/hooks/useMessageDrafts';
import { useMessageEdit } from '@/hooks/useMessageEdit';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MessagingInterface = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const creatorId = searchParams.get('creator');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [packs, setPacks] = useState([]);
  const [isCreator, setIsCreator] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string; created_at: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, loading: messagesLoading, refetch, sendMessage, sending: messageSending } = useMessages(conversationId, creatorId);
  const { credits, hasCredits } = useCredits(creatorId);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(conversationId, user?.id || null);
  const { scheduleMessage } = useScheduledMessages(user?.id || null);
  const { pinMessage, unpinMessage } = usePinnedMessages(conversationId, user?.id || null);
  const { draft, saveDraft, clearDraft, lastSaved } = useMessageDrafts(conversationId, user?.id || null);
  const { canEdit } = useMessageEdit();
  
  // Mark messages as read when viewing conversation
  useReadReceipts(conversationId, user?.id || null);

  // Sync message state with draft
  useEffect(() => {
    if (draft && !message) {
      setMessage(draft);
    }
  }, [draft]);

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
      // Check if current user is the creator
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      setIsCreator(profile?.role === 'creator' && user.id === creatorId);

      // Fetch or create conversation
      let { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', user.id)
        .eq('creator_id', creatorId)
        .maybeSingle();

      if (conversation) {
        setConversationId(conversation.id);
      }

      // Fetch packs
      const { data: packsData } = await supabase
        .from('message_packs')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_active', true);
      
      setPacks(packsData || []);
    };

    fetchData();
  }, [creatorId, user]);

  const handleSend = async () => {
    if (!message.trim() || !creatorId || !user) return;

    // Creators don't need credits to send messages
    if (!isCreator && !hasCredits) {
      toast({
        title: "No credits",
        description: "Purchase message credits to continue",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // Create conversation if doesn't exist
      let convId = conversationId;
      if (!convId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            customer_id: user.id,
            creator_id: creatorId,
          })
          .select('id')
          .single();

        if (convError) throw convError;
        convId = newConv.id;
        setConversationId(convId);
      }

      // Send message using the hook (handles credit deduction)
      await sendMessage(message);

      // Send notification to recipient (async, don't wait)
      const recipientId = isCreator ? 
        (await supabase.from('conversations').select('customer_id').eq('id', convId).single()).data?.customer_id :
        creatorId;
      
      if (recipientId) {
        // Send email notification
        supabase.functions.invoke('send-notification', {
          body: {
            type: 'new_message',
            recipientId,
            senderName: user.user_metadata?.display_name || 'Someone',
            messagePreview: message.substring(0, 100),
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

      setMessage('');
      clearDraft();
      stopTyping();
    } catch (error: any) {
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

    // Creators don't need credits to send messages
    if (!isCreator && !hasCredits) {
      toast({
        title: "No credits",
        description: "Purchase message credits to continue",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // Create conversation if doesn't exist
      let convId = conversationId;
      if (!convId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            customer_id: user.id,
            creator_id: creatorId,
          })
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

      // Send notification
      const recipientId = isCreator ? 
        (await supabase.from('conversations').select('customer_id').eq('id', convId).single()).data?.customer_id :
        creatorId;
      
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
      clearDraft();
    }
  };

  const filteredMessages = messages.filter(msg => 
    searchQuery ? msg.content.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  if (loading) return null;
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="font-semibold">Messages</h2>
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
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {showSearch && (
          <div className="max-w-4xl mx-auto mt-4">
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {creatorId && !isCreator && (
            <>
              {!hasCredits && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Purchase message credits below to start chatting
                  </AlertDescription>
                </Alert>
              )}
              
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold">{credits}</div>
                  <div className="text-sm text-muted-foreground">
                    Message credits remaining
                  </div>
                </div>
              </Card>
              
              <MessagePackPurchase creatorId={creatorId} packs={packs} />
            </>
          )}

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
              <Card className="p-4">
                <p className="text-muted-foreground text-center">
                  No messages yet. Send your first message!
                </p>
              </Card>
            ) : (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.sender_id === user?.id ? 'justify-end' : ''
                  }`}
                >
                  {msg.sender_id !== user?.id && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>C</AvatarFallback>
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
                           {msg.sender_id === user?.id && (
                             <span className="text-xs opacity-70 flex items-center gap-1">
                               {msg.read_at ? (
                                 <CheckCheck className="h-3 w-3" />
                               ) : (
                                 <Check className="h-3 w-3" />
                               )}
                             </span>
                           )}
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

      <div className="border-t bg-card px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {isCreator && conversationId && (
            <div className="mb-3 flex justify-end">
              <UnlockableUpload 
                conversationId={conversationId}
                creatorId={user?.id || ''}
                onSuccess={refetch}
              />
            </div>
          )}
          {lastSaved && message && (
            <div className="mb-2 text-xs text-muted-foreground flex items-center gap-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
              Draft saved {new Date(lastSaved).toLocaleTimeString()}
            </div>
          )}
          <div className="flex gap-2">
            {isCreator && user?.id && (
              <MessageTemplateSelector
                creatorId={user.id}
                onSelectTemplate={(content) => {
                  setMessage(content);
                  saveDraft(content);
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
              disabled={sending || (!hasCredits && !isCreator)}
            />
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => {
                const newValue = e.target.value;
                setMessage(newValue);
                saveDraft(newValue);
                if (newValue && userDisplayName) {
                  startTyping(userDisplayName);
                } else {
                  stopTyping();
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSend();
                  stopTyping();
                }
              }}
              onBlur={() => stopTyping()}
            />
            <Button 
              onClick={handleSend} 
              disabled={sending || !message.trim() || (!hasCredits && !isCreator)}
              title={!hasCredits && !isCreator ? 'Purchase credits to send messages' : ''}
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
    </div>
  );
};

export default MessagingInterface;
