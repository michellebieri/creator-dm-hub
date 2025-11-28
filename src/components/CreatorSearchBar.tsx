import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreatorSearchBarProps {
  prominent?: boolean;
}

export const CreatorSearchBar = ({ prominent = false }: CreatorSearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSearch = async () => {
    const username = searchQuery.trim().replace('@', '').toLowerCase();
    if (!username) return;

    setIsSearching(true);
    try {
      const { data: creator, error } = await supabase
        .from('profiles')
        .select('username, role')
        .eq('username', username)
        .eq('role', 'creator')
        .single();

      if (error || !creator) {
        toast({
          title: 'Creator not found',
          description: `Creator '@${username}' not found. Please check the username.`,
          variant: 'destructive',
        });
        return;
      }

      navigate(`/@${creator.username}`);
      setSearchQuery('');
    } catch (error) {
      console.error('Error searching for creator:', error);
      toast({
        title: 'Search error',
        description: 'Failed to search for creator',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={`relative ${prominent ? 'w-full' : ''}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search creator..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={isSearching}
        className={`pl-10 ${prominent ? 'h-12 text-lg' : ''}`}
      />
    </div>
  );
};
