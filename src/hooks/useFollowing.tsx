import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFollowing = (userId: string | undefined, creatorId: string | null) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (creatorId) {
      checkFollowing();
      fetchFollowersCount();
    }
  }, [userId, creatorId]);

  const checkFollowing = async () => {
    if (!userId || !creatorId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', userId)
        .eq('following_id', creatorId)
        .maybeSingle();

      if (error) throw error;

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking following status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowersCount = async () => {
    if (!creatorId) return;

    try {
      const { count, error } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', creatorId);

      if (error) throw error;

      setFollowersCount(count || 0);
    } catch (error) {
      console.error('Error fetching followers count:', error);
    }
  };

  const toggleFollow = async () => {
    if (!userId || !creatorId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow creators",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', userId)
          .eq('following_id', creatorId);

        if (error) throw error;

        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        
        toast({
          title: "Unfollowed",
          description: "You've unfollowed this creator",
        });
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: userId,
            following_id: creatorId,
          });

        if (error) throw error;

        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);

        toast({
          title: "Following",
          description: "You're now following this creator",
        });
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update follow status",
        variant: "destructive",
      });
    }
  };

  return {
    isFollowing,
    followersCount,
    loading,
    toggleFollow,
  };
};
