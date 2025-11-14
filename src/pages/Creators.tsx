import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OnlineStatusBadge } from '@/components/OnlineStatusBadge';
import { MessageCircle, Search, Loader2, ArrowLeft, TrendingUp, DollarSign, Filter } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

interface Creator {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  price_per_message?: number;
  total_messages?: number;
  is_accepting_messages?: boolean;
  created_at: string;
}

const Creators = () => {
  const navigate = useNavigate();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [priceFilter, setPriceFilter] = useState('all');

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'creator')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Enrich with creator settings
        const enrichedCreators = await Promise.all(
          (profiles || []).map(async (profile) => {
            const { data: settings } = await supabase
              .from('creator_settings')
              .select('price_per_message, is_accepting_messages')
              .eq('user_id', profile.id)
              .single();

            const { count: messageCount } = await supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('sender_id', profile.id);

            return {
              ...profile,
              price_per_message: settings?.price_per_message || 5,
              is_accepting_messages: settings?.is_accepting_messages ?? true,
              total_messages: messageCount || 0,
            };
          })
        );

        setCreators(enrichedCreators);
        setFilteredCreators(enrichedCreators);
      } catch (error) {
        console.error('Error fetching creators:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCreators();
  }, []);

  useEffect(() => {
    let filtered = creators;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(creator =>
        creator.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (creator.bio?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply price filter
    if (priceFilter !== 'all') {
      const price = creator => creator.price_per_message || 5;
      switch (priceFilter) {
        case 'low':
          filtered = filtered.filter(c => price(c) < 5);
          break;
        case 'medium':
          filtered = filtered.filter(c => price(c) >= 5 && price(c) < 10);
          break;
        case 'high':
          filtered = filtered.filter(c => price(c) >= 10);
          break;
      }
    }

    // Apply sorting
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => (b.total_messages || 0) - (a.total_messages || 0));
        break;
      case 'price-low':
        filtered.sort((a, b) => (a.price_per_message || 5) - (b.price_per_message || 5));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.price_per_message || 5) - (a.price_per_message || 5));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredCreators(filtered);
  }, [searchQuery, creators, sortBy, priceFilter]);

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

          {/* Search Bar & Filters */}
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="w-[180px]">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="low">Under $5</SelectItem>
                  <SelectItem value="medium">$5 - $10</SelectItem>
                  <SelectItem value="high">$10+</SelectItem>
                </SelectContent>
              </Select>

              <Badge variant="secondary" className="px-4 py-2">
                <Filter className="h-4 w-4 mr-2" />
                {filteredCreators.length} creators
              </Badge>
            </div>
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
                      <div className="relative inline-block">
                        <Avatar className="h-20 w-20 shadow-medium">
                          <AvatarFallback className="text-2xl gradient-primary text-primary-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1">
                          <OnlineStatusBadge userId={creator.id} size="md" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{creator.display_name}</h3>
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-sm text-muted-foreground">@{creator.username}</p>
                          <OnlineStatusBadge userId={creator.id} size="sm" />
                        </div>
                      </div>
                      {creator.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {creator.bio}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          ${creator.price_per_message || 5}/message
                        </span>
                        {creator.total_messages && creator.total_messages > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {creator.total_messages} msgs
                          </Badge>
                        )}
                      </div>
                      
                      <Button 
                        className="w-full gradient-primary text-primary-foreground"
                        disabled={!creator.is_accepting_messages}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {creator.is_accepting_messages ? 'View Profile' : 'Not Available'}
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
