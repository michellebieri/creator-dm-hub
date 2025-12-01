import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, MessageSquare, Clock, Calendar, TrendingUp, ArrowUpDown, DollarSign } from 'lucide-react';
import { useConversationStats } from '@/hooks/useConversationStats';
import { formatDistanceToNow } from 'date-fns';

interface ConversationStatsProps {
  conversationId: string;
  userId: string;
}

export const ConversationStats = ({ conversationId, userId }: ConversationStatsProps) => {
  const { stats, loading } = useConversationStats(conversationId, userId);

  const formatResponseTime = (milliseconds: number | null) => {
    if (!milliseconds) return 'N/A';
    
    const minutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return 'Less than 1m';
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <BarChart3 className="h-4 w-4 mr-2" />
          Stats
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conversation Statistics</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading stats...
          </div>
        ) : !stats ? (
          <div className="py-8 text-center text-muted-foreground">
            No statistics available
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overview Card */}
            <Card className="p-4 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Messages</p>
                  <p className="text-3xl font-bold text-primary">{stats.totalMessages}</p>
                </div>
                <MessageSquare className="h-12 w-12 text-primary/20" />
              </div>
            </Card>

            {/* Message Distribution */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Sent</p>
                </div>
                <p className="text-2xl font-bold">{stats.sentMessages}</p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  {stats.totalMessages > 0 
                    ? Math.round((stats.sentMessages / stats.totalMessages) * 100)
                    : 0}%
                </Badge>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Received</p>
                </div>
                <p className="text-2xl font-bold">{stats.receivedMessages}</p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  {stats.totalMessages > 0 
                    ? Math.round((stats.receivedMessages / stats.totalMessages) * 100)
                    : 0}%
                </Badge>
              </Card>
            </div>

            {/* Response Time */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Average Response Time</p>
              </div>
              <p className="text-xl font-bold">
                {formatResponseTime(stats.averageResponseTime)}
              </p>
              {stats.averageResponseTime && (
                <p className="text-xs text-muted-foreground mt-1">
                  Time between messages
                </p>
              )}
            </Card>

            {/* Activity Info */}
            <div className="space-y-3">
              {stats.mostActiveDay && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Most Active Day</p>
                  </div>
                  <p className="text-lg font-semibold">{stats.mostActiveDay}</p>
                </Card>
              )}

              {stats.lastActivity && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Last Activity</p>
                  </div>
                  <p className="text-lg font-semibold">
                    {formatDistanceToNow(new Date(stats.lastActivity), { addSuffix: true })}
                  </p>
                </Card>
              )}
            </div>

            {/* Total Paid */}
            <Card className="p-4 bg-accent/10">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Total Paid</p>
              </div>
              <p className="text-2xl font-bold">
                ${stats.totalPaid.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total amount paid
              </p>
            </Card>

            {/* Unread Badge */}
            {stats.unreadCount > 0 && (
              <Card className="p-4 bg-primary/10 border-primary/20">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Unread Messages</p>
                  <Badge variant="default" className="text-lg px-3 py-1">
                    {stats.unreadCount}
                  </Badge>
                </div>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
