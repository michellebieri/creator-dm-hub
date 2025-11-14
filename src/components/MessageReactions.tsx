import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { cn } from '@/lib/utils';

interface MessageReactionsProps {
  messageId: string;
  userId: string | null;
}

const COMMON_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥'];

export const MessageReactions = ({ messageId, userId }: MessageReactionsProps) => {
  const { reactions, toggleReaction } = useMessageReactions(messageId, userId);
  const [open, setOpen] = useState(false);

  const handleReactionClick = async (reaction: string) => {
    await toggleReaction(reaction);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reactions.map((r) => (
        <Button
          key={r.reaction}
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 px-2 text-xs gap-1',
            r.hasUserReacted && 'bg-primary/10 border border-primary/20'
          )}
          onClick={() => toggleReaction(r.reaction)}
        >
          <span>{r.reaction}</span>
          <span className="text-muted-foreground">{r.count}</span>
        </Button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <SmilePlus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-4 gap-1">
            {COMMON_REACTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-xl hover:bg-accent"
                onClick={() => handleReactionClick(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
