import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessagePackPurchase } from '@/components/MessagePackPurchase';
import { UnlockableContent } from '@/components/UnlockableContent';
import { UnlockableUpload } from '@/components/UnlockableUpload';
import { Send, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMessages } from '@/hooks/useMessages';
import { useCredits } from '@/hooks/useCredits';
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
  
  const { messages, loading: messagesLoading, refetch } = useMessages(conversationId);
  const { credits, hasCredits, deductCredit } = useCredits(creatorId);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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

      // Deduct credit for customers only
      if (!isCreator) {
        const credited = await deductCredit();
        if (!credited) {
          throw new Error('Failed to deduct credit');
        }
      }

      // Send message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          sender_id: user.id,
          content: message,
          is_paid: isCreator || true,
        });

      if (msgError) throw msgError;

      setMessage('');
      toast({
        title: "Message sent",
        description: isCreator ? "Message sent successfully" : `${credits - 1} credits remaining`,
      });
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
        </div>
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
              messages.map((msg) => (
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
                    <Card
                      className={`p-3 ${
                        msg.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : ''
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </Card>
                    {msg.unlockables && msg.unlockables.length > 0 && (
                      <div className="space-y-2">
                        {msg.unlockables.map((unlockable) => (
                          <UnlockableContent key={unlockable.id} unlockable={unlockable} />
                        ))}
                      </div>
                    )}
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
          <div className="flex gap-3">
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
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
    </div>
  );
};

export default MessagingInterface;
