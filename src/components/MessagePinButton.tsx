import { Button } from '@/components/ui/button';
import { Pin, PinOff } from 'lucide-react';

interface MessagePinButtonProps {
  isPinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
}

export const MessagePinButton = ({ isPinned, onPin, onUnpin }: MessagePinButtonProps) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={isPinned ? onUnpin : onPin}
    >
      {isPinned ? (
        <>
          <PinOff className="h-3 w-3 mr-1" />
          Unpin
        </>
      ) : (
        <>
          <Pin className="h-3 w-3 mr-1" />
          Pin
        </>
      )}
    </Button>
  );
};
