import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pin, X } from 'lucide-react';
import { usePinnedMessages } from '@/hooks/usePinnedMessages';

interface PinnedMessagesProps {
  conversationId: string;
  userId: string;
  onUnpin: (messageId: string) => void;
}

export const PinnedMessages = ({ conversationId, userId, onUnpin }: PinnedMessagesProps) => {
  const { pinnedMessages } = usePinnedMessages(conversationId, userId);

  if (pinnedMessages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Pin className="h-4 w-4" />
        <span>Pinned Messages</span>
      </div>
      {pinnedMessages.map((msg) => (
        <Card key={msg.id} className="p-3 bg-accent/50 border-primary/20">
          <div className="flex items-start gap-3">
            <Pin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm line-clamp-2">{msg.content}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(msg.created_at).toLocaleString()}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => onUnpin(msg.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
