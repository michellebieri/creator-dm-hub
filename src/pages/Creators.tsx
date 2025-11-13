import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageCircle, Search, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

interface Creator {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
}

const Creators = () => {
  const navigate = useNavigate();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'creator')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCreators(data || []);
        setFilteredCreators(data || []);
      } catch (error) {
        console.error('Error fetching creators:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCreators();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCreators(creators);
      return;
    }

    const filtered = creators.filter(creator =>
      creator.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (creator.bio?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredCreators(filtered);
  }, [searchQuery, creators]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft sticky top-0 z-10">
        <div className="container mx-auto max-w-6xl px-4 py-4">
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

      {/* Hero Section */}
      <section className="gradient-hero py-12 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Discover Creators
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Find and connect with your favorite creators through direct messages
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      {/* Creators Grid */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCreators.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Creators Found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'No creators have joined yet'}
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCreators.map((creator) => {
                const initials = creator.display_name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <Card
                    key={creator.id}
                    className="p-6 hover:shadow-large transition-all cursor-pointer"
                    onClick={() => navigate(`/creator/${creator.username}`)}
                  >
                    <div className="text-center space-y-4">
                      <Avatar className="h-20 w-20 mx-auto shadow-medium">
                        <AvatarFallback className="text-2xl gradient-primary text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{creator.display_name}</h3>
                        <p className="text-sm text-muted-foreground">@{creator.username}</p>
                      </div>
                      {creator.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {creator.bio}
                        </p>
                      )}
                      <Button className="w-full gradient-primary text-primary-foreground">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        View Profile
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Creators;
