import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Activity, MessageCircle, ShoppingBag, Crown, DollarSign, MessageSquare, UserPlus, Upload } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  activity_type: 'message' | 'purchase' | 'subscription' | 'tip' | 'comment' | 'follow' | 'content_upload';
  content: string;
  metadata: any;
  created_at: string;
}

const ActivityFeed = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  const fetchActivities = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities((data || []) as ActivityItem[]);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="h-5 w-5 text-primary" />;
      case 'purchase':
        return <ShoppingBag className="h-5 w-5 text-primary" />;
      case 'subscription':
        return <Crown className="h-5 w-5 text-primary" />;
      case 'tip':
        return <DollarSign className="h-5 w-5 text-primary" />;
      case 'comment':
        return <MessageSquare className="h-5 w-5 text-primary" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-primary" />;
      case 'content_upload':
        return <Upload className="h-5 w-5 text-primary" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getActivityColor = (_type: string) => {
    return 'bg-primary/10';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Activity className="h-8 w-8" />
          Activity Feed
        </h1>
        <p className="text-muted-foreground">
          Recent activities and updates
        </p>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No Recent Activity"
          description="Your activities will appear here"
        />
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${getActivityColor(activity.activity_type)}`}>
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {activity.activity_type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
