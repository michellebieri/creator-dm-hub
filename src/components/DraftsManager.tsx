import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Trash2, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Draft {
  conversationId: string;
  content: string;
  timestamp: number;
  otherUserName?: string;
  otherUserId?: string;
}

interface DraftsManagerProps {
  userId: string;
}

export const DraftsManager = ({ userId }: DraftsManagerProps) => {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchDrafts();
    }
  }, [open]);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const draftPrefix = `message_draft_${userId}_`;
      const allDrafts: Draft[] = [];

      // Get all draft keys from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(draftPrefix)) {
          const conversationId = key.replace(draftPrefix, '');
          const draftData = localStorage.getItem(key);
          
          if (draftData) {
            try {
              const parsed = JSON.parse(draftData);
              
              // Fetch conversation details
              const { data: conversation } = await supabase
                .from('conversations')
                .select(`
                  *,
                  creator:profiles!conversations_creator_id_fkey(id, display_name),
                  customer:profiles!conversations_customer_id_fkey(id, display_name)
                `)
                .eq('id', conversationId)
                .single();

              if (conversation) {
                const otherUser = userId === conversation.creator_id 
                  ? conversation.customer 
                  : conversation.creator;

                allDrafts.push({
                  conversationId,
                  content: parsed.content,
                  timestamp: parsed.timestamp,
                  otherUserName: otherUser?.display_name,
                  otherUserId: otherUser?.id,
                });
              }
            } catch (error) {
              console.error('Error parsing draft:', error);
            }
          }
        }
      }

      // Sort by most recent
      allDrafts.sort((a, b) => b.timestamp - a.timestamp);
      setDrafts(allDrafts);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load drafts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDraft = (draft: Draft) => {
    setOpen(false);
    navigate(`/messages?creator=${draft.otherUserId}`);
  };

  const handleDeleteDraft = (conversationId: string) => {
    const key = `message_draft_${userId}_${conversationId}`;
    localStorage.removeItem(key);
    setDrafts(prev => prev.filter(d => d.conversationId !== conversationId));
    toast({
      title: 'Draft deleted',
      description: 'Draft has been removed',
    });
  };

  const handleClearAllDrafts = () => {
    drafts.forEach(draft => {
      const key = `message_draft_${userId}_${draft.conversationId}`;
      localStorage.removeItem(key);
    });
    setDrafts([]);
    toast({
      title: 'All drafts cleared',
      description: 'All drafts have been removed',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Drafts
          {drafts.length > 0 && (
            <Badge variant="default" className="ml-2 h-5 px-1.5 text-xs">
              {drafts.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Message Drafts</DialogTitle>
            {drafts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllDrafts}
              >
                Clear All
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading drafts...
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No drafts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Unfinished messages will be automatically saved here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <Card
                  key={draft.conversationId}
                  className="p-4 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleOpenDraft(draft)}
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">
                          {draft.otherUserName || 'Unknown User'}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDraft(draft.conversationId);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {draft.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(draft.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
