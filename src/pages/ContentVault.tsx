import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Unlockable {
  id: string;
  media_url: string;
  media_type: string;
  price: number;
  created_at: string;
  unlocked_by: string[] | null;
}

export default function ContentVault() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [unlockables, setUnlockables] = useState<Unlockable[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUnlockables();
    }
  }, [user]);

  const fetchUnlockables = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('unlockables')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unlockables:', error);
      return;
    }

    setUnlockables(data || []);
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-14 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-screen-lg mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Content vault</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4 space-y-4">
        {/* Add photos or videos */}
        <button 
          onClick={() => navigate('/content-upload')}
          className="flex items-center justify-between w-full p-4 bg-card rounded-lg border border-border hover:bg-muted/50 transition-colors"
        >
          <div>
            <div className="text-base font-medium text-left">Add photos or videos</div>
            <div className="text-sm text-muted-foreground mt-1">Upload up to 20 items at once.</div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Albums */}
        <Card className="p-4">
          <button 
            className="flex items-center justify-between w-full"
            onClick={() => navigate('/collections')}
          >
            <h2 className="text-lg font-bold">Albums</h2>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <div className="mt-4 text-center py-8 text-muted-foreground">
            No album created yet.
          </div>
        </Card>

        {/* Filters */}
        <div className="flex gap-2">
          <Select defaultValue="all-tags">
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-tags">Tags</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="all-types">
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-types">All types</SelectItem>
              <SelectItem value="images">Images</SelectItem>
              <SelectItem value="videos">Videos</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="ghost" size="icon">
            <Filter className="h-5 w-5" />
          </Button>
        </div>

        {/* Content Grid */}
        <div className="py-12">
          {unlockables.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No content was found
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {unlockables.map((item) => (
                <div 
                  key={item.id} 
                  className="aspect-square bg-muted rounded-lg overflow-hidden relative"
                >
                  {item.media_type === 'image' ? (
                    <img 
                      src={item.media_url} 
                      alt="Vault content" 
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        console.error('Image load error:', item.media_url);
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ) : item.media_type === 'video' ? (
                    <video 
                      src={item.media_url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs">{item.media_type}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                    ${item.price}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
