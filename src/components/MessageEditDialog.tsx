import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { useMessageEdit } from '@/hooks/useMessageEdit';

interface MessageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  currentContent: string;
  createdAt: string;
  onSuccess: () => void;
}

export const MessageEditDialog = ({
  open,
  onOpenChange,
  messageId,
  currentContent,
  createdAt,
  onSuccess,
}: MessageEditDialogProps) => {
  const [content, setContent] = useState(currentContent);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const { editMessage, editing, getTimeRemaining } = useMessageEdit();

  useEffect(() => {
    if (!open) return;

    setContent(currentContent);

    // Update time remaining every second
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(createdAt);
      setTimeRemaining(remaining);
      
      if (!remaining) {
        clearInterval(interval);
        onOpenChange(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [open, createdAt, currentContent]);

  const handleSave = async () => {
    const success = await editMessage(messageId, content);
    if (success) {
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {timeRemaining && (
            <Badge variant="secondary" className="flex items-center gap-2 w-fit">
              <Clock className="h-3 w-3" />
              {timeRemaining} remaining to edit
            </Badge>
          )}

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[100px]"
            autoFocus
          />

          <p className="text-xs text-muted-foreground">
            You can edit messages within 15 minutes of sending
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={editing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={editing || !content.trim() || content === currentContent}
          >
            {editing ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
