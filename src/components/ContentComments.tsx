import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle } from 'lucide-react';

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface ContentCommentsProps {
  unlockableId: string;
}

export const ContentComments = ({ unlockableId }: ContentCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
    
    // Subscribe to new comments
    const channel = supabase
      .channel(`comments-${unlockableId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'content_comments',
        filter: `unlockable_id=eq.${unlockableId}`,
      }, () => {
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unlockableId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('content_comments')
        .select(`
          *,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('unlockable_id', unlockableId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('content_comments')
        .insert([{
          unlockable_id: unlockableId,
          user_id: user.id,
          comment: newComment,
        }]);

      if (error) throw error;

      setNewComment('');
      toast({
        title: "Comment posted",
        description: "Your comment has been added",
      });
    } catch (error: any) {
      toast({
        title: "Failed to post comment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
        />
        <Button onClick={handleSubmit} disabled={loading || !newComment.trim()}>
          {loading ? 'Posting...' : 'Post Comment'}
        </Button>
      </div>

      <div className="space-y-4">
        {comments.map((comment) => (
          <Card key={comment.id} className="p-4">
            <div className="flex gap-3">
              <Avatar>
                <AvatarImage src={comment.profiles.avatar_url || undefined} />
                <AvatarFallback>{comment.profiles.display_name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{comment.profiles.display_name}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm">{comment.comment}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
