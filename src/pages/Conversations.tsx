import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { OnlineStatusBadge } from '@/components/OnlineStatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageCircle, MessageSquare, MoreVertical, Archive, ArchiveRestore, Inbox, CheckSquare, BarChart3, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useConversationArchive } from '@/hooks/useConversationArchive';
import { useConversationLabels } from '@/hooks/useConversationLabels';
import { ConversationLabelManager } from '@/components/ConversationLabelManager';
import { ConversationLabelPicker } from '@/components/ConversationLabelPicker';
import { ConversationLabelFilter } from '@/components/ConversationLabelFilter';
import { DraftsManager } from '@/components/DraftsManager';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { ConversationStats } from '@/components/ConversationStats';
import { BookmarksView } from '@/components/BookmarksView';
import { AdvancedSearch } from '@/components/AdvancedSearch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

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
  const [showArchived, setShowArchived] = useState(false);
  const [selectedLabelFilter, setSelectedLabelFilter] = useState<string | null>(null);
  const [conversationLabels, setConversationLabels] = useState<Record<string, string[]>>({});
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const { archiveConversation, unarchiveConversation } = useConversationArchive();
  const { assignLabel } = useConversationLabels(user?.id || null);
  const { toast } = useToast();

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
          .eq('status', showArchived ? 'archived' : 'active')
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

        // Filter out conversations where creator_id === customer_id (self-conversations)
        // This ensures users never see their own name in the conversation list
        const validConversations = conversationsWithMessages.filter(conv => 
          conv.creator_id !== conv.customer_id
        );

        setConversations(validConversations);

        // Fetch label assignments for all conversations
        if (conversationsWithMessages.length > 0) {
          const convIds = conversationsWithMessages.map(c => c.id);
          const { data: assignments } = await supabase
            .from('conversation_label_assignments')
            .select('conversation_id, label_id')
            .in('conversation_id', convIds);

          if (assignments) {
            const labelMap: Record<string, string[]> = {};
            assignments.forEach(assignment => {
              if (!labelMap[assignment.conversation_id]) {
                labelMap[assignment.conversation_id] = [];
              }
              labelMap[assignment.conversation_id].push(assignment.label_id);
            });
            setConversationLabels(labelMap);
          }
        }
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
  }, [user, showArchived]);

  const handleOpenConversation = (conversation: Conversation) => {
    // Navigate to messages with the OTHER person in the conversation
    if (user?.id === conversation.customer_id) {
      // User is the customer, so navigate to chat with the creator
      navigate(`/messages?creator=${conversation.creator_id}`);
    } else {
      // User is the creator, so navigate to chat with the customer
      navigate(`/messages?creator=${conversation.customer_id}`);
    }
  };

  const handleArchive = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    const success = showArchived 
      ? await unarchiveConversation(conversationId)
      : await archiveConversation(conversationId);
    
    if (success) {
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    }
  };

  const toggleConversationSelection = (conversationId: string) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedConversations.size === filteredConversations.length) {
      setSelectedConversations(new Set());
    } else {
      setSelectedConversations(new Set(filteredConversations.map(c => c.id)));
    }
  };

  const handleBulkArchive = async () => {
    const conversationIds = Array.from(selectedConversations);
    let successCount = 0;

    for (const id of conversationIds) {
      const success = showArchived 
        ? await unarchiveConversation(id)
        : await archiveConversation(id);
      if (success) successCount++;
    }

    if (successCount > 0) {
      setConversations(prev => prev.filter(c => !selectedConversations.has(c.id)));
      toast({
        title: showArchived ? 'Messages restored' : 'Messages archived',
        description: `${successCount} message(s) ${showArchived ? 'restored' : 'archived'} successfully`,
      });
    }

    setSelectedConversations(new Set());
    setBulkActionMode(false);
  };

  const handleBulkAssignLabel = async (labelId: string) => {
    const conversationIds = Array.from(selectedConversations);
    let successCount = 0;

    for (const id of conversationIds) {
      const success = await assignLabel(id, labelId);
      if (success) successCount++;
    }

    if (successCount > 0) {
      toast({
        title: 'Label assigned',
        description: `Label assigned to ${successCount} conversation(s)`,
      });
    }

    setSelectedConversations(new Set());
    setBulkActionMode(false);
  };

  const filteredConversations = conversations.filter(conv => {
    const otherUser = user?.id === conv.customer_id ? conv.creator : conv.customer;
    const searchLower = searchQuery.toLowerCase();
    
    // Filter by search query
    const matchesSearch = (
      otherUser?.display_name.toLowerCase().includes(searchLower) ||
      otherUser?.username.toLowerCase().includes(searchLower) ||
      conv.last_message?.content.toLowerCase().includes(searchLower)
    );
    
    // Filter by label if one is selected
    const matchesLabel = !selectedLabelFilter || 
      (conversationLabels[conv.id]?.includes(selectedLabelFilter));
    
    return matchesSearch && matchesLabel;
  });

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingSpinner size="lg" text="Loading messages..." />
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-primary" />
            Messages
          </h1>
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={showArchived ? 'outline' : 'default'}
              size="sm"
              onClick={() => setShowArchived(false)}
            >
              <Inbox className="h-4 w-4 mr-2" />
              Inbox
            </Button>
            <Button
              variant={showArchived ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowArchived(true)}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archived
            </Button>
            {user?.id && <ConversationLabelManager userId={user.id} />}
            {user?.id && <DraftsManager userId={user.id} />}
            {user?.id && <BookmarksView userId={user.id} />}
            {user?.id && <AdvancedSearch userId={user.id} />}
            <Button
              variant={bulkActionMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setBulkActionMode(!bulkActionMode);
                if (bulkActionMode) {
                  setSelectedConversations(new Set());
                }
              }}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              {bulkActionMode ? 'Cancel Selection' : 'Select'}
            </Button>
            {bulkActionMode && filteredConversations.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectedConversations.size === filteredConversations.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>
          
          {user?.id && (
            <ConversationLabelFilter 
              userId={user.id}
              selectedLabelId={selectedLabelFilter}
              onSelectLabel={setSelectedLabelFilter}
            />
          )}
          
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {filteredConversations.length === 0 ? (
          searchQuery ? (
            <EmptyState
              icon={MessageSquare}
              title="No messages found"
              description="Try adjusting your search terms"
            />
          ) : (
            <EmptyState
              icon={MessageCircle}
              title="No messages yet"
              description="Start messaging creators to see your messages here"
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
              const isSelected = selectedConversations.has(conversation.id);

              return (
                <Card
                  key={conversation.id}
                  className={`p-4 hover:shadow-medium transition-all ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {bulkActionMode && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleConversationSelection(conversation.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <div 
                      className="flex items-center gap-4 flex-1 cursor-pointer"
                      onClick={() => !bulkActionMode && handleOpenConversation(conversation)}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={otherUser?.avatar_url} />
                          <AvatarFallback>
                            {otherUser?.display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1">
                          <OnlineStatusBadge userId={otherUser?.id || ''} size="md" />
                        </div>
                      </div>
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
                        {user?.id && (
                          <div className="mt-2">
                            <ConversationLabelPicker
                              conversationId={conversation.id}
                              userId={user.id}
                            />
                          </div>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user?.id && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <div onClick={(e) => e.stopPropagation()}>
                              <ConversationStats conversationId={conversation.id} userId={user.id} />
                            </div>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => handleArchive(e, conversation.id)}>
                          {showArchived ? (
                            <>
                              <ArchiveRestore className="h-4 w-4 mr-2" />
                              Restore
                            </>
                          ) : (
                            <>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {user?.id && (
        <BulkActionsBar
          selectedCount={selectedConversations.size}
          showArchived={showArchived}
          userId={user.id}
          onArchive={handleBulkArchive}
          onUnarchive={handleBulkArchive}
          onAssignLabel={handleBulkAssignLabel}
          onClear={() => {
            setSelectedConversations(new Set());
            setBulkActionMode(false);
          }}
        />
      )}
    </div>
  );
};

export default Conversations;
