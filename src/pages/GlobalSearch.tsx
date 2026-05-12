import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, Users, MessageCircle, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GlobalSearch = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searching, setSearching] = useState(false);
  const [creators, setCreators] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || !user) return;

    setSearching(true);
    try {
      // Search creators using secure RPC function (only returns safe public data)
      const { data: creatorsData } = await supabase
        .rpc('search_creators', { search_query: searchQuery });

      setCreators(creatorsData || []);

      // Search messages (only in user's conversations)
      const { data: conversationsData } = await supabase
        .from('conversations')
        .select('id')
        .or(`creator_id.eq.${user.id},customer_id.eq.${user.id}`);

      if (conversationsData && conversationsData.length > 0) {
        const conversationIds = conversationsData.map(c => c.id);
        const { data: messagesData } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url)
          `)
          .in('conversation_id', conversationIds)
          .ilike('content', `%${searchQuery}%`)
          .limit(20);

        setMessages(messagesData || []);
      }

      // Search unlockable content — only show content the user has unlocked or created
      const { data: contentData } = await supabase
        .from('unlockables')
        .select(`
          id, caption, media_type, price, created_at,
          creator_id, unlocked_by,
          creator:profiles!unlockables_creator_id_fkey(id, username, display_name, avatar_url)
        `)
        .or(`creator_id.eq.${user.id},unlocked_by.cs.{${user.id}}`)
        .ilike('caption', `%${searchQuery}%`)
        .limit(10);

      setContent(contentData || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Search</h1>

        <form onSubmit={handleSearch} className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search creators, messages, and content..."
            className="pl-10 pr-20 h-12 text-lg"
          />
          <Button
            type="submit"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            disabled={searching || !query.trim()}
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </form>

        {query && (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="creators">
                <Users className="h-4 w-4 mr-2" />
                Creators ({creators.length})
              </TabsTrigger>
              <TabsTrigger value="messages">
                <MessageCircle className="h-4 w-4 mr-2" />
                Messages ({messages.length})
              </TabsTrigger>
              <TabsTrigger value="content">
                <Image className="h-4 w-4 mr-2" />
                Content ({content.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {searching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {creators.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Creators</h3>
                      <div className="space-y-2">
                        {creators.slice(0, 3).map(creator => (
                          <Card
                            key={creator.id}
                            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => navigate(`/creator/${creator.username}`)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={creator.avatar_url || undefined} />
                                <AvatarFallback>
                                  {creator.display_name.split(' ').map((n: string) => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium">{creator.display_name}</p>
                                <p className="text-sm text-muted-foreground">@{creator.username}</p>
                              </div>
                              <Badge>Creator</Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Messages</h3>
                      <div className="space-y-2">
                        {messages.slice(0, 3).map(message => (
                          <Card key={message.id} className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={message.sender?.avatar_url} />
                                <AvatarFallback>
                                  {message.sender?.display_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{message.sender?.display_name}</p>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {message.content}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {content.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Content</h3>
                      <div className="space-y-2">
                        {content.slice(0, 3).map(item => (
                          <Card key={item.id} className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                                <Image className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{item.media_type} content</p>
                                <p className="text-sm text-muted-foreground">
                                  by {item.creator?.display_name}
                                </p>
                              </div>
                              <Badge variant="secondary">${item.price}</Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {!searching && creators.length === 0 && messages.length === 0 && content.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      No results found for "{query}"
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="creators" className="space-y-2">
              {creators.map(creator => (
                <Card
                  key={creator.id}
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/creator/${creator.username}`)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={creator.avatar_url || undefined} />
                      <AvatarFallback>
                        {creator.display_name.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{creator.display_name}</p>
                      <p className="text-sm text-muted-foreground">@{creator.username}</p>
                      {creator.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{creator.bio}</p>
                      )}
                    </div>
                    <Badge>Creator</Badge>
                  </div>
                </Card>
              ))}
              {creators.length === 0 && !searching && (
                <p className="text-center py-8 text-muted-foreground">No creators found</p>
              )}
            </TabsContent>

            <TabsContent value="messages" className="space-y-2">
              {messages.map(message => (
                <Card key={message.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender?.avatar_url} />
                      <AvatarFallback>
                        {message.sender?.display_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{message.sender?.display_name}</p>
                      <p className="text-sm text-muted-foreground">{message.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(message.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
              {messages.length === 0 && !searching && (
                <p className="text-center py-8 text-muted-foreground">No messages found</p>
              )}
            </TabsContent>

            <TabsContent value="content" className="space-y-2">
              {content.map(item => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium capitalize">{item.media_type} content</p>
                      <p className="text-sm text-muted-foreground">
                        by {item.creator?.display_name}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {item.message?.content}
                      </p>
                    </div>
                    <Badge variant="secondary">${item.price}</Badge>
                  </div>
                </Card>
              ))}
              {content.length === 0 && !searching && (
                <p className="text-center py-8 text-muted-foreground">No content found</p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;
