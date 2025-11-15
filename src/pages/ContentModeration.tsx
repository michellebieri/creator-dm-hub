import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ContentModeration = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unlockables, setUnlockables] = useState<any[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchContent();
    }
  }, [user, loading, navigate]);

  const fetchContent = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('unlockables')
        .select(`
          *,
          message:messages!unlockables_message_id_fkey(
            id,
            content,
            conversation_id,
            conversations!messages_conversation_id_fkey(
              customer:profiles!conversations_customer_id_fkey(
                id,
                username,
                display_name,
                avatar_url
              )
            )
          )
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUnlockables(data || []);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast({
        title: "Error",
        description: "Failed to fetch content",
        variant: "destructive",
      });
    } finally {
      setLoadingContent(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedContent) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('unlockables')
        .delete()
        .eq('id', selectedContent);

      if (error) throw error;

      toast({
        title: "Content deleted",
        description: "The content has been removed",
      });

      setDeleteDialogOpen(false);
      await fetchContent();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: "Error",
        description: "Failed to delete content",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setSelectedContent(null);
    }
  };

  const openDeleteDialog = (contentId: string) => {
    setSelectedContent(contentId);
    setDeleteDialogOpen(true);
  };

  if (loading || loadingContent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Content Moderation</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Unlockable Content</CardTitle>
          <CardDescription>
            Manage and moderate your uploaded content
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unlockables.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No unlockable content yet
            </p>
          ) : (
            <div className="space-y-4">
              {unlockables.map((content) => (
                <div
                  key={content.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                      {content.media_type === 'image' && <Eye className="h-6 w-6" />}
                      {content.media_type === 'video' && <Eye className="h-6 w-6" />}
                      {content.media_type === 'audio' && <Eye className="h-6 w-6" />}
                      {content.media_type === 'document' && <Eye className="h-6 w-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="capitalize">
                          {content.media_type}
                        </Badge>
                        <Badge variant="secondary">${content.price}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {content.message?.content || 'No description'}
                      </p>
                      {content.message?.conversations?.customer && (
                        <div className="flex items-center gap-2 mt-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={content.message.conversations.customer.avatar_url} />
                            <AvatarFallback>
                              {content.message.conversations.customer.display_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-xs text-muted-foreground">
                            Sent to {content.message.conversations.customer.display_name}
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Unlocked by {content.unlocked_by?.length || 0} user(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(content.media_url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(content.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this content? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContentModeration;
