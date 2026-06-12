import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const WelcomeMessage = () => {
  const navigate = useNavigate();
  const { messageNumber } = useParams<{ messageNumber: string }>();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && messageNumber) {
      fetchMessage();
    }
  }, [user, messageNumber]);

  const fetchMessage = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('creator_settings')
        .select(`welcome_message_${messageNumber}`)
        .eq('user_id', user?.id)
        .single();

      if (data) {
        const saved = (data as any)[`welcome_message_${messageNumber}`];
        const defaults: Record<string, string> = {
          '1': "Hey! 👋 Thanks for reaching out — I'm so glad you're here. I'll get back to you soon!",
          '2': "Thanks for your message! I read every one. Looking forward to chatting with you 😊",
          '3': "You're awesome for reaching out! Stay tuned — I'll reply shortly 🙏",
        };
        setMessage(saved || (messageNumber ? defaults[messageNumber] || '' : ''));
      }
    } catch (error) {
      console.error('Error fetching welcome message:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveMessage = async () => {
    if (!user || !messageNumber) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('creator_settings')
        .upsert({
          user_id: user.id,
          [`welcome_message_${messageNumber}`]: message,
        } as any);

      if (error) throw error;
      toast.success('Welcome message saved');
      navigate('/account-settings');
    } catch (error) {
      console.error('Error saving message:', error);
      toast.error('Failed to save message');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate('/account-settings')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">
            Welcome Message {messageNumber}
          </h1>
          <Button variant="ghost" size="sm" onClick={saveMessage} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Welcome Message {messageNumber}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message Content</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Enter your ${messageNumber === '1' ? 'first' : messageNumber === '2' ? 'second' : 'third'} welcome message...`}
                rows={10}
              />
              <p className="text-xs text-muted-foreground">
                This message is automatically sent to fans when they start a conversation with you. A warm greeting makes a great first impression!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WelcomeMessage;
