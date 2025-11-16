import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ContentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    id: string;
    media_url: string;
    media_type: string;
    price: number;
    created_at: string;
  };
  onUpdate: () => void;
}

export function ContentEditModal({ isOpen, onClose, content, onUpdate }: ContentEditModalProps) {
  const [price, setPrice] = useState(content.price.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('unlockables')
      .update({ price: priceNum })
      .eq('id', content.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update content",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Content updated successfully"
      });
      onUpdate();
      onClose();
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const { error } = await supabase
      .from('unlockables')
      .delete()
      .eq('id', content.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete content",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Content deleted successfully"
      });
      onUpdate();
      onClose();
    }
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Content Preview */}
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              {content.media_type === 'image' ? (
                <img 
                  src={content.media_url} 
                  alt="Content preview" 
                  className="w-full h-full object-contain"
                />
              ) : content.media_type === 'video' ? (
                <video 
                  src={content.media_url}
                  className="w-full h-full object-contain"
                  controls
                />
              ) : null}
            </div>

            {/* Upload Date */}
            <div className="text-sm text-muted-foreground">
              Uploaded: {new Date(content.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>

            {/* Price Input */}
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="9.99"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this content? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
