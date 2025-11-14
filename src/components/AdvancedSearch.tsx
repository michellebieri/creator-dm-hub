import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Search, Filter, Pin, MessageSquare } from 'lucide-react';
import { useMessageSearch } from '@/hooks/useMessageSearch';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface AdvancedSearchProps {
  userId: string;
}

export const AdvancedSearch = ({ userId }: AdvancedSearchProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messageType, setMessageType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [conversationId, setConversationId] = useState<string>('');
  const [hasReactions, setHasReactions] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { results, loading, search, clearResults } = useMessageSearch(userId);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      fetchConversations();
    }
  }, [open]);

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select(`
        id,
        creator:profiles!conversations_creator_id_fkey(display_name),
        customer:profiles!conversations_customer_id_fkey(display_name)
      `)
      .or(`creator_id.eq.${userId},customer_id.eq.${userId}`)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    setConversations(data || []);
  };

  const handleSearch = () => {
    search({
      query,
      messageType: messageType || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      conversationId: conversationId || undefined,
      hasReactions: hasReactions || undefined,
      isPinned: isPinned || undefined,
    });
  };

  const handleClear = () => {
    setQuery('');
    setMessageType('');
    setDateFrom('');
    setDateTo('');
    setConversationId('');
    setHasReactions(false);
    setIsPinned(false);
    clearResults();
  };

  const handleResultClick = (result: any) => {
    setOpen(false);
    navigate(`/messages?creator=${result.conversation.creator_id || result.conversation.customer_id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Search className="h-4 w-4 mr-2" />
          Advanced Search
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Search Messages</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Search messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={!query.trim() || loading}>
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <Card className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Message Type</Label>
                  <Select value={messageType} onValueChange={setMessageType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="voice">Voice</SelectItem>
                      <SelectItem value="unlockable">Unlockable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Conversation</Label>
                  <Select value={conversationId} onValueChange={setConversationId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All conversations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All conversations</SelectItem>
                      {conversations.map((conv) => {
                        const otherUser = userId === conv.creator?.id ? conv.customer : conv.creator;
                        return (
                          <SelectItem key={conv.id} value={conv.id}>
                            {otherUser?.display_name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={hasReactions}
                    onCheckedChange={setHasReactions}
                  />
                  <Label>Has Reactions</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={isPinned}
                    onCheckedChange={setIsPinned}
                  />
                  <Label>Pinned Only</Label>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={handleClear} className="w-full">
                Clear Filters
              </Button>
            </Card>
          )}

          {/* Results */}
          <ScrollArea className="max-h-[400px]">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {query ? 'No messages found' : 'Enter a search term to get started'}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Found {results.length} message{results.length !== 1 ? 's' : ''}
                </p>
                {results.map((result) => (
                  <Card
                    key={result.id}
                    className="p-3 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={result.sender.avatar_url} />
                        <AvatarFallback>
                          {result.sender.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium">
                            {result.sender.display_name}
                          </p>
                          {result.message_type === 'voice' && (
                            <Badge variant="secondary" className="text-xs">Voice</Badge>
                          )}
                          {result.is_pinned && (
                            <Pin className="h-3 w-3 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.content}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {result.conversation.creator.display_name} & {result.conversation.customer.display_name}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            • {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
