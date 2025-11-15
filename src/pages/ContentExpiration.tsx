import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ExpirableContent {
  id: string;
  media_url: string;
  media_type: string;
  price: number;
  expires_at: string | null;
  created_at: string;
  unlocked_count: number;
}

export default function ContentExpiration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeContent, setActiveContent] = useState<ExpirableContent[]>([]);
  const [expiredContent, setExpiredContent] = useState<ExpirableContent[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchContent();
  }, [user, navigate]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('unlockables')
        .select('*')
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const active: ExpirableContent[] = [];
      const expired: ExpirableContent[] = [];

      data?.forEach((item) => {
        const contentItem = {
          ...item,
          unlocked_count: item.unlocked_by?.length || 0,
        };

        if (item.expires_at && new Date(item.expires_at) < now) {
          expired.push(contentItem);
        } else {
          active.push(contentItem);
        }
      });

      setActiveContent(active);
      setExpiredContent(expired);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveExpiration = async (id: string) => {
    try {
      const { error } = await supabase
        .from('unlockables')
        .update({ expires_at: null })
        .eq('id', id);

      if (error) throw error;

      toast.success('Expiration removed');
      fetchContent();
    } catch (error) {
      console.error('Error removing expiration:', error);
      toast.error('Failed to remove expiration');
    }
  };

  const ContentCard = ({ content, isExpired }: { content: ExpirableContent; isExpired: boolean }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Badge variant={isExpired ? 'destructive' : 'default'}>
            {content.media_type}
          </Badge>
          ${content.price.toFixed(2)}
        </CardTitle>
        {isExpired ? (
          <XCircle className="h-4 w-4 text-destructive" />
        ) : (
          <CheckCircle className="h-4 w-4 text-success" />
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Created {formatDistanceToNow(new Date(content.created_at), { addSuffix: true })}
        </div>

        {content.expires_at && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span className={isExpired ? 'text-destructive' : 'text-muted-foreground'}>
              {isExpired ? 'Expired' : 'Expires'}{' '}
              {formatDistanceToNow(new Date(content.expires_at), { addSuffix: true })}
            </span>
          </div>
        )}

        <div className="text-sm">
          <span className="font-medium">{content.unlocked_count}</span> unlocks
        </div>

        {content.expires_at && !isExpired && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRemoveExpiration(content.id)}
            className="w-full"
          >
            Remove Expiration
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Content Expiration</h1>
        <p className="text-muted-foreground">
          Manage time-limited content and track expiration status
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Active Content ({activeContent.length})
          </h2>
          <div className="space-y-4">
            {activeContent.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No active content
                </CardContent>
              </Card>
            ) : (
              activeContent.map((content) => (
                <ContentCard key={content.id} content={content} isExpired={false} />
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">
            Expired Content ({expiredContent.length})
          </h2>
          <div className="space-y-4">
            {expiredContent.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No expired content
                </CardContent>
              </Card>
            ) : (
              expiredContent.map((content) => (
                <ContentCard key={content.id} content={content} isExpired={true} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
