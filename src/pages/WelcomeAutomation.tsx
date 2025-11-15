import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';

export default function WelcomeAutomation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchSettings();
  }, [user, navigate]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('auto_replies')
        .select('*')
        .eq('creator_id', user?.id)
        .eq('trigger_condition', 'new_follower')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setEnabled(data.is_active);
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!message.trim()) {
      toast.error('Please enter a welcome message');
      return;
    }

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('auto_replies')
        .select('id')
        .eq('creator_id', user?.id)
        .eq('trigger_condition', 'new_follower')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('auto_replies')
          .update({
            message,
            is_active: enabled,
            title: 'Welcome Message',
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('auto_replies')
          .insert({
            creator_id: user?.id,
            message,
            is_active: enabled,
            title: 'Welcome Message',
            trigger_condition: 'new_follower',
          });

        if (error) throw error;
      }

      toast.success('Welcome message saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const templates = [
    "Hey! Thanks for following! 🎉 I'm excited to connect with you. Feel free to message me anytime!",
    "Welcome! 👋 So glad you're here. Check out my exclusive content and don't hesitate to reach out!",
    "Thanks for the follow! 💫 You now have access to all my content. Let me know if you have any questions!",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome Automation</h1>
        <p className="text-muted-foreground">
          Send automated welcome messages to new followers
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome Message Settings</CardTitle>
            <CardDescription>
              Configure the automatic message sent to new followers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Enable Welcome Messages</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send messages to new followers
                </p>
              </div>
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Welcome Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your welcome message..."
                rows={6}
                disabled={!enabled}
              />
              <p className="text-sm text-muted-foreground">
                This message will be sent automatically when someone follows you
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Welcome Message'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Message Templates
            </CardTitle>
            <CardDescription>
              Quick templates to get you started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.map((template, index) => (
              <Card key={index} className="bg-muted/50">
                <CardContent className="p-4">
                  <p className="text-sm mb-3">{template}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMessage(template)}
                  >
                    Use This Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
