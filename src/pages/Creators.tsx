import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Search, MessageCircle, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Creator {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  price_per_message?: number;
}

const Creators = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    try {
      const { data: creatorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'creator');

      if (rolesError) throw rolesError;

      if (!creatorRoles || creatorRoles.length === 0) {
        setCreators([]);
        setLoading(false);
        return;
      }

      const creatorIds = creatorRoles.map(r => r.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, bio, avatar_url')
        .in('id', creatorIds);

      if (profilesError) throw profilesError;

      const { data: settings } = await supabase
        .from('creator_settings')
        .select('user_id, price_per_message')
        .in('user_id', creatorIds);

      const creatorsWithPricing = profiles?.map(profile => ({
        ...profile,
        price_per_message: settings?.find(s => s.user_id === profile.id)?.price_per_message || 5
      })) || [];

      setCreators(creatorsWithPricing);
    } catch (error) {
      console.error('Error fetching creators:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (creatorId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('creator_id', creatorId)
      .eq('customer_id', user.id)
      .single();

    if (existingConv) {
      navigate('/conversations');
    } else {
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          creator_id: creatorId,
          customer_id: user.id,
          status: 'active'
        })
        .select()
        .single();

      if (!error && newConv) {
        navigate('/conversations');
      }
    }
  };

  const filteredCreators = creators.filter(creator =>
    creator.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    creator.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Discover Creators</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredCreators.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No creators found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCreators.map((creator) => (
              <Card key={creator.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={creator.avatar_url || undefined} />
                      <AvatarFallback>
                        {creator.display_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{creator.display_name}</h3>
                      <p className="text-sm text-muted-foreground">@{creator.username}</p>
                    </div>
                  </div>
                  
                  {creator.bio && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {creator.bio}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-semibold">${creator.price_per_message}</span>
                      <span className="text-muted-foreground"> / message</span>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleStartChat(creator.id)}
                      className="gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Creators;
