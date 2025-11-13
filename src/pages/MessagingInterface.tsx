import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CreditsBalance } from '@/components/CreditsBalance';
import { MessagePackPurchase } from '@/components/MessagePackPurchase';
import { Send, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MessagingInterface = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const creatorId = searchParams.get('creator');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [packs, setPacks] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!creatorId) return;

    const fetchPacks = async () => {
      const { data } = await supabase
        .from('message_packs')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_active', true);
      
      setPacks(data || []);
    };

    fetchPacks();
  }, [creatorId]);

  const handleSend = async () => {
    if (!message.trim() || !creatorId) return;

    setSending(true);
    try {
      // Create conversation if doesn't exist
      let { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', user?.id)
        .eq('creator_id', creatorId)
        .maybeSingle();

      if (!conversation) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            customer_id: user?.id,
            creator_id: creatorId,
          })
          .select()
          .single();

        if (convError) throw convError;
        conversation = newConv;
      }

      // Send message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user?.id,
          content: message,
          is_paid: true,
        });

      if (msgError) throw msgError;

      setMessage('');
      toast({
        title: "Message sent",
        description: "Your message has been delivered",
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
          {creatorId && (
            <>
              <CreditsBalance creatorId={creatorId} />
              <MessagePackPurchase creatorId={creatorId} packs={packs} />
            </>
          )}
          
          <Card className="p-4">
            <p className="text-muted-foreground text-center">
              Messages will appear here
            </p>
          </Card>
        </div>
      </div>

      <div className="border-t bg-card px-4 py-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} disabled={sending || !message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessagingInterface;
