import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SocialsSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [socials, setSocials] = useState({
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    twitch: '',
    twitter: '',
    snapchat: '',
    other_url: '',
  });

  useEffect(() => {
    if (user) {
      fetchSocials();
    }
  }, [user]);

  const fetchSocials = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('creator_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setSocials({
          facebook: (data as any).social_facebook || '',
          instagram: (data as any).social_instagram || '',
          tiktok: (data as any).social_tiktok || '',
          youtube: (data as any).social_youtube || '',
          twitch: (data as any).social_twitch || '',
          twitter: (data as any).social_twitter || '',
          snapchat: (data as any).social_snapchat || '',
          other_url: (data as any).social_other_url || '',
        });
      }
    } catch (error) {
      console.error('Error fetching socials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('Not signed in');
      return;
    }
    try {
      setSaving(true);
      // Upsert so a fresh creator with no creator_settings row gets one
      // created. .update().eq() silently affected 0 rows and toasted success.
      const { error } = await supabase
        .from('creator_settings')
        .upsert({
          user_id: user.id,
          social_facebook: socials.facebook,
          social_instagram: socials.instagram,
          social_tiktok: socials.tiktok,
          social_youtube: socials.youtube,
          social_twitch: socials.twitch,
          social_twitter: socials.twitter,
          social_snapchat: socials.snapchat,
          social_other_url: socials.other_url,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success('Social links saved successfully');
    } catch (error: any) {
      console.error('Error saving socials:', error);
      toast.error(error?.message || 'Failed to save social links');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Socials</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Social Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                placeholder="https://facebook.com/username"
                value={socials.facebook}
                onChange={(e) => setSocials({ ...socials, facebook: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                placeholder="https://instagram.com/username"
                value={socials.instagram}
                onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok">TikTok</Label>
              <Input
                id="tiktok"
                placeholder="https://tiktok.com/@username"
                value={socials.tiktok}
                onChange={(e) => setSocials({ ...socials, tiktok: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube">YouTube</Label>
              <Input
                id="youtube"
                placeholder="https://youtube.com/@username"
                value={socials.youtube}
                onChange={(e) => setSocials({ ...socials, youtube: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitch">Twitch</Label>
              <Input
                id="twitch"
                placeholder="https://twitch.tv/username"
                value={socials.twitch}
                onChange={(e) => setSocials({ ...socials, twitch: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter (X)</Label>
              <Input
                id="twitter"
                placeholder="https://x.com/username"
                value={socials.twitter}
                onChange={(e) => setSocials({ ...socials, twitter: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="snapchat">Snapchat</Label>
              <Input
                id="snapchat"
                placeholder="https://snapchat.com/add/username"
                value={socials.snapchat}
                onChange={(e) => setSocials({ ...socials, snapchat: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="other">Other URL</Label>
              <Input
                id="other"
                placeholder="https://..."
                value={socials.other_url}
                onChange={(e) => setSocials({ ...socials, other_url: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default SocialsSettings;
