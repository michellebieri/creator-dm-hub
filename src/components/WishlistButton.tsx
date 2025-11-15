import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WishlistButtonProps {
  unlockableId: string;
}

export const WishlistButton = ({ unlockableId }: WishlistButtonProps) => {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkWishlist();
  }, [unlockableId]);

  const checkWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('wishlists')
        .select('id')
        .eq('customer_id', user.id)
        .eq('unlockable_id', unlockableId)
        .single();

      setIsWishlisted(!!data);
    } catch (error) {
      // Not in wishlist
    }
  };

  const toggleWishlist = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (isWishlisted) {
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('customer_id', user.id)
          .eq('unlockable_id', unlockableId);

        if (error) throw error;
        setIsWishlisted(false);
        toast({ title: "Removed from wishlist" });
      } else {
        const { error } = await supabase
          .from('wishlists')
          .insert([{
            customer_id: user.id,
            unlockable_id: unlockableId,
          }]);

        if (error) throw error;
        setIsWishlisted(true);
        toast({ title: "Added to wishlist" });
      }
    } catch (error: any) {
      toast({
        title: "Failed to update wishlist",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isWishlisted ? "default" : "outline"}
      size="icon"
      onClick={toggleWishlist}
      disabled={loading}
    >
      <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
    </Button>
  );
};
