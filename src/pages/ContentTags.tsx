import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface Tag {
  id: string;
  name: string;
  usage_count: number;
}

const ContentTags = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTags();
    }
  }, [user]);

  const fetchTags = async () => {
    try {
      const { data: allTags, error: tagsError } = await supabase
        .from('content_tags')
        .select('id, name')
        .order('name');

      if (tagsError) throw tagsError;

      // Get usage count for each tag
      const tagsWithCount = await Promise.all(
        (allTags || []).map(async (tag) => {
          const { count } = await supabase
            .from('content_tag_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('tag_id', tag.id)
            .in('unlockable_id', 
              await supabase
                .from('unlockables')
                .select('id')
                .eq('creator_id', user?.id || '')
                .then(res => res.data?.map(u => u.id) || [])
            );

          return {
            ...tag,
            usage_count: count || 0,
          };
        })
      );

      setTags(tagsWithCount);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTag.trim()) return;

    setCreating(true);
    try {
      const { error } = await supabase
        .from('content_tags')
        .insert({ name: newTag.trim().toLowerCase() });

      if (error) {
        if (error.code === '23505') {
          toast.error('This tag already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Tag created successfully');
      setNewTag('');
      fetchTags();
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Failed to create tag');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`Delete tag "${tagName}"? This will remove it from all content.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('content_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      toast.success('Tag deleted successfully');
      fetchTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('Failed to delete tag');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Content Tags</h1>
        <p className="text-muted-foreground">
          Create and manage tags to organize your content
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create New Tag</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter tag name..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
            />
            <Button onClick={handleCreateTag} disabled={creating || !newTag.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Tags ({tags.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No tags yet. Create your first tag above.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="flex items-center gap-2">
                  {tag.name}
                  <span className="text-xs text-muted-foreground">({tag.usage_count})</span>
                  <button
                    onClick={() => handleDeleteTag(tag.id, tag.name)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentTags;
