import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { OnlineStatusBadge } from '@/components/OnlineStatusBadge';
import { MessageCircle, Shield, Zap, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { MessagePackPurchase } from '@/components/MessagePackPurchase';
import { CreditsBalance } from '@/components/CreditsBalance';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
}

const CreatorProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreatorData = async () => {
      if (!username) return;

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .eq('role', 'creator')
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        const { data: packsData } = await supabase
          .from('message_packs')
          .select('*')
          .eq('creator_id', profileData.id)
          .eq('is_active', true)
          .order('quantity', { ascending: true });

        setPacks(packsData || []);
      } catch (error: any) {
        console.error('Error fetching creator:', error);
        toast({
          title: "Creator not found",
          description: "The creator you're looking for doesn't exist",
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchCreatorData();
  }, [username, navigate, toast]);

  const handleStartConversation = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to start a conversation",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!profile) return;
    navigate(`/messages?creator=${profile.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = profile.display_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-soft sticky top-0 z-10">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">DM.me</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <section className="gradient-hero py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="relative inline-block mb-6">
            <Avatar className="h-32 w-32 shadow-large">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-4xl gradient-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-2 right-2">
              <OnlineStatusBadge userId={profile.id} size="lg" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-1">{profile.display_name}</h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <OnlineStatusBadge userId={profile.id} showLabel size="md" />
          </div>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            {profile.bio || `Connect with ${profile.display_name} through direct messages`}
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Badge variant="secondary" className="shadow-soft">
              <Shield className="h-3 w-3 mr-1" />
              Verified Creator
            </Badge>
            <Badge variant="secondary" className="shadow-soft">
              <Zap className="h-3 w-3 mr-1" />
              Fast Response
            </Badge>
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">
          {user && user.id !== profile.id && (
            <CreditsBalance creatorId={profile.id} />
          )}

          {packs.length > 0 ? (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Start a Conversation</h2>
                <p className="text-muted-foreground">
                  Purchase message credits to chat with {profile.display_name}
                </p>
              </div>

              <MessagePackPurchase creatorId={profile.id} packs={packs} />

              <div className="text-center pt-4">
                <Button
                  size="lg"
                  onClick={handleStartConversation}
                  className="gradient-primary text-primary-foreground"
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Go to Messages
                </Button>
              </div>
            </>
          ) : (
            <Card className="p-8 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Message Packs Available</h3>
              <p className="text-muted-foreground">
                This creator hasn't set up message packs yet. Check back soon!
              </p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
};

export default CreatorProfile;
