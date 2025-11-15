import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function ContentWatermark() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchWatermarkSettings();
  }, [user, navigate]);

  const fetchWatermarkSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('creator_settings')
        .select('watermark_enabled, watermark_text')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setWatermarkEnabled(data.watermark_enabled || false);
        setWatermarkText(data.watermark_text || '');
      }
    } catch (error) {
      console.error('Error fetching watermark settings:', error);
      toast.error('Failed to load watermark settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('creator_settings')
        .update({
          watermark_enabled: watermarkEnabled,
          watermark_text: watermarkText,
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Watermark settings saved');
    } catch (error) {
      console.error('Error saving watermark settings:', error);
      toast.error('Failed to save watermark settings');
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-3xl font-bold mb-2">Content Watermarking</h1>
        <p className="text-muted-foreground">
          Protect your content by automatically adding watermarks to uploaded media
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Watermark Settings</CardTitle>
          <CardDescription>
            Configure how your content will be watermarked
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="watermark-enabled">Enable Watermarking</Label>
              <p className="text-sm text-muted-foreground">
                Automatically add watermarks to all uploaded content
              </p>
            </div>
            <Switch
              id="watermark-enabled"
              checked={watermarkEnabled}
              onCheckedChange={setWatermarkEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="watermark-text">Watermark Text</Label>
            <Input
              id="watermark-text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="e.g., @yourusername or © Your Name"
              disabled={!watermarkEnabled}
            />
            <p className="text-sm text-muted-foreground">
              This text will appear on your protected content
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Preview</h4>
            <div className="relative bg-background border rounded-lg h-48 flex items-center justify-center">
              <span className="text-muted-foreground">Your Content</span>
              {watermarkEnabled && watermarkText && (
                <div className="absolute bottom-4 right-4 bg-background/80 px-3 py-1 rounded text-sm font-medium">
                  {watermarkText}
                </div>
              )}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
