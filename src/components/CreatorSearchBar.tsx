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
    const searchTerm = searchQuery.trim().replace('@', '');
    if (!searchTerm) return;

    setIsSearching(true);
    try {
      // Try exact username match first (case-insensitive)
      let { data: creator, error } = await supabase
        .from('profiles')
        .select('username, role')
        .ilike('username', searchTerm)
        .eq('role', 'creator')
        .limit(1)
        .maybeSingle();

      // If not found, try partial username match
      if (!creator) {
        const { data: partialMatch } = await supabase
          .from('profiles')
          .select('username, role')
          .ilike('username', `%${searchTerm}%`)
          .eq('role', 'creator')
          .limit(1)
          .maybeSingle();
        creator = partialMatch;
      }

      // If still not found, try display name match
      if (!creator) {
        const { data: nameMatch } = await supabase
          .from('profiles')
          .select('username, role')
          .ilike('display_name', `%${searchTerm}%`)
          .eq('role', 'creator')
          .limit(1)
          .maybeSingle();
        creator = nameMatch;
      }

      if (!creator) {
        toast({
          title: 'Creator not found',
          description: `No creator found matching '${searchTerm}'. Try searching by username or display name.`,
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
