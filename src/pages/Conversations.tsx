import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { MessageCircle, ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  creator_id: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  customer?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
  unread_count?: number;
}

const Conversations = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            *,
            creator:profiles!conversations_creator_id_fkey(*),
            customer:profiles!conversations_customer_id_fkey(*)
          `)
          .or(`creator_id.eq.${user.id},customer_id.eq.${user.id}`)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        // Fetch last message and unread count for each conversation
        const conversationsWithMessages = await Promise.all(
          (data || []).map(async (conv) => {
            const { data: messages } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1);

            // Count unread messages (messages not sent by user and not read)
            const { count: unreadCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', user.id)
              .is('read_at', null);

            return {
              ...conv,
              last_message: messages?.[0],
              unread_count: unreadCount || 0,
            };
          })
        );

        setConversations(conversationsWithMessages);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Subscribe to conversation updates
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `creator_id=eq.${user.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleOpenConversation = (conversation: Conversation) => {
    if (user?.id === conversation.customer_id) {
      navigate(`/messages?creator=${conversation.creator_id}`);
    } else {
      navigate(`/messages?creator=${conversation.customer_id}`);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const otherUser = user?.id === conv.customer_id ? conv.creator : conv.customer;
    const searchLower = searchQuery.toLowerCase();
    return (
      otherUser?.display_name.toLowerCase().includes(searchLower) ||
      otherUser?.username.toLowerCase().includes(searchLower) ||
      conv.last_message?.content.toLowerCase().includes(searchLower)
    );
  });

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingSpinner size="lg" text="Loading conversations..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-soft sticky top-0 z-10">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Conversations</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {filteredConversations.length === 0 ? (
          searchQuery ? (
            <EmptyState
              icon={MessageSquare}
              title="No conversations found"
              description="Try adjusting your search terms"
            />
          ) : (
            <EmptyState
              icon={MessageCircle}
              title="No conversations yet"
              description="Start messaging creators to see your conversations here"
              action={{
                label: 'Browse Creators',
                onClick: () => navigate('/creators'),
              }}
            />
          )
        ) : (
          <div className="space-y-3">
            {filteredConversations.map((conversation) => {
              const otherUser = user?.id === conversation.creator_id 
                ? conversation.customer 
                : conversation.creator;

              return (
                <Card
                  key={conversation.id}
                  className="p-4 hover:shadow-medium transition-all cursor-pointer"
                  onClick={() => handleOpenConversation(conversation)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={otherUser?.avatar_url} />
                      <AvatarFallback>
                        {otherUser?.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {otherUser?.display_name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          @{otherUser?.username}
                        </Badge>
                        {conversation.unread_count && conversation.unread_count > 0 && (
                          <Badge variant="default" className="ml-auto text-xs">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                      {conversation.last_message ? (
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.last_message.content}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No messages yet
                        </p>
                      )}
                    </div>
                    {conversation.last_message && (
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.last_message.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversations;
