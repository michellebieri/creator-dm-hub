import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, X, AlertCircle } from 'lucide-react';
import { useScheduledMessages } from '@/hooks/useScheduledMessages';
import { formatDistanceToNow } from 'date-fns';

interface ScheduledMessagesListProps {
  senderId: string;
}

export const ScheduledMessagesList = ({ senderId }: ScheduledMessagesListProps) => {
  const { scheduledMessages, cancelScheduledMessage } = useScheduledMessages(senderId);

  const pendingMessages = scheduledMessages.filter(msg => msg.status === 'pending');
  const failedMessages = scheduledMessages.filter(msg => msg.status === 'failed');

  if (pendingMessages.length === 0 && failedMessages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {pendingMessages.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            <span>Scheduled ({pendingMessages.length})</span>
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
        </>
      )}

      {failedMessages.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to Send ({failedMessages.length})</span>
          </div>
          {failedMessages.map((msg) => (
            <Card key={msg.id} className="p-3 border-destructive/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{msg.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="destructive" className="text-xs">Failed</Badge>
                    <span className="text-xs text-muted-foreground">
                      Scheduled for {new Date(msg.scheduled_at).toLocaleString()}
                    </span>
                  </div>
                  {(msg as any).error_message && (
                    <p className="text-xs text-destructive mt-1 truncate">{(msg as any).error_message}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => cancelScheduledMessage(msg.id)}
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};
