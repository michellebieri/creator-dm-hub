import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Pencil, Trash2, Bot, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface AiDraft {
  id: string;
  conversation_id: string;
  creator_id: string;
  draft_content: string;
  trigger_message_id: string | null;
  status: string;
  created_at: string;
  fan_name: string | null;
  fan_id: string | null;
}

const AiDraftsReview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [drafts, setDrafts] = useState<AiDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchDrafts();

    const channel = supabase
      .channel(`ai-drafts-review-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ai_draft_messages',
        filter: `creator_id=eq.${user.id}`,
      }, () => fetchDrafts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchDrafts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_draft_messages')
        .select(`
          id, conversation_id, creator_id, draft_content,
          trigger_message_id, status, created_at,
          conversations!inner(customer_id)
        `)
        .eq('creator_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const draftsWithNames: AiDraft[] = await Promise.all(
        (data || []).map(async (d: any) => {
          const fanId = d.conversations?.customer_id ?? null;
          let fanName: string | null = null;
          if (fanId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', fanId)
              .maybeSingle();
            fanName = profile?.display_name ?? null;
          }
          return {
            id: d.id,
            conversation_id: d.conversation_id,
            creator_id: d.creator_id,
            draft_content: d.draft_content,
            trigger_message_id: d.trigger_message_id,
            status: d.status,
            created_at: d.created_at,
            fan_name: fanName,
            fan_id: fanId,
          };
        })
      );

      setDrafts(draftsWithNames);
    } catch (err) {
      console.error('AiDraftsReview: fetch failed', err);
      toast({ title: 'Error', description: 'Failed to load AI drafts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (draft: AiDraft) => {
    setProcessingId(draft.id);
    try {
      const contentToSend = editingId === draft.id ? editContent : draft.draft_content;

      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: draft.conversation_id,
        sender_id: draft.creator_id,
        content: contentToSend,
        message_type: 'text',
        is_paid: false,
      });

      if (msgError) throw msgError;

      await supabase.from('ai_draft_messages').update({ status: 'sent' }).eq('id', draft.id);

      setDrafts(prev => prev.filter(d => d.id !== draft.id));
      setEditingId(null);
      toast({ title: 'Sent', description: 'Message sent to fan.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Failed to send message', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDiscard = async (draftId: string) => {
    setProcessingId(draftId);
    try {
      await supabase.from('ai_draft_messages').update({ status: 'dismissed' }).eq('id', draftId);
      setDrafts(prev => prev.filter(d => d.id !== draftId));
      toast({ title: 'Discarded', description: 'Draft removed.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Failed to discard', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const startEdit = (draft: AiDraft) => {
    setEditingId(draft.id);
    setEditContent(draft.draft_content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">AI Draft Replies</h1>
          {drafts.length > 0 && (
            <Badge variant="default" className="h-5 px-1.5 text-xs">{drafts.length}</Badge>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading drafts…</div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-16">
            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium text-muted-foreground">No pending AI drafts</p>
            <p className="text-sm text-muted-foreground mt-1">
              Switch your AI persona to <strong>draft</strong> mode to review replies before they send.
            </p>
          </div>
        ) : (
          drafts.map(draft => (
            <Card key={draft.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      Reply to: {draft.fan_name ?? 'Fan'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => navigate(`/messages?creator=${draft.fan_id}`)}
                  >
                    View conversation
                  </Button>
                </div>

                {editingId === draft.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className="min-h-[80px] resize-none text-sm"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(draft)}
                        disabled={!editContent.trim() || processingId === draft.id}
                        className="flex-1"
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        Send edited
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEdit}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted rounded-md p-3 text-sm text-foreground">
                    {draft.draft_content}
                  </div>
                )}

                {editingId !== draft.id && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(draft)}
                      disabled={processingId === draft.id}
                      className="flex-1"
                    >
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      Approve &amp; Send
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(draft)}
                      disabled={processingId === draft.id}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDiscard(draft.id)}
                      disabled={processingId === draft.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AiDraftsReview;
