import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Ban } from 'lucide-react';
import { toast } from 'sonner';

interface BlockUserDialogProps {
  userId: string;
  userName: string;
  onBlock?: () => void;
}

export const BlockUserDialog = ({ userId, userName, onBlock }: BlockUserDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const handleBlock = async () => {
    if (!user) return;

    setBlocking(true);
    try {
      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: userId,
        });

      if (error) throw error;

      toast.success(`${userName} has been blocked`);
      setOpen(false);
      onBlock?.();
    } catch (error: any) {
      console.error('Error blocking user:', error);
      if (error.code === '23505') {
        toast.error('User is already blocked');
      } else {
        toast.error('Failed to block user');
      }
    } finally {
      setBlocking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Ban className="h-4 w-4 mr-2" />
          Block
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block {userName}?</DialogTitle>
          <DialogDescription className="space-y-2">
            <p>Blocking this user will:</p>
            <ul className="list-disc list-inside ml-4 text-sm">
              <li>Prevent them from sending you messages</li>
              <li>Hide their content from you</li>
              <li>Remove them from your followers</li>
            </ul>
            <p className="mt-2">You can unblock them later from your blocked users list.</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleBlock} disabled={blocking}>
            {blocking ? 'Blocking...' : 'Block User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
