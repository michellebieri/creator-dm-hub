import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, X } from 'lucide-react';
import { useScheduledMessages } from '@/hooks/useScheduledMessages';
import { formatDistanceToNow } from 'date-fns';

interface ScheduledMessagesListProps {
  senderId: string;
}

export const ScheduledMessagesList = ({ senderId }: ScheduledMessagesListProps) => {
  const { scheduledMessages, cancelScheduledMessage } = useScheduledMessages(senderId);

  const pendingMessages = scheduledMessages.filter(msg => msg.status === 'pending');

  if (pendingMessages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4" />
        <span>Scheduled Messages ({pendingMessages.length})</span>
      </div>
      {pendingMessages.map((msg) => (
        <Card key={msg.id} className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{msg.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {formatDistanceToNow(new Date(msg.scheduled_at), { addSuffix: true })}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(msg.scheduled_at).toLocaleString()}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => cancelScheduledMessage(msg.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
