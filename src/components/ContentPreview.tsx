import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Eye } from 'lucide-react';

interface ContentPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType: 'image' | 'video' | 'audio';
  mediaUrl: string;
  price: number;
  onPurchase: () => void;
  isUnlocked: boolean;
}

export const ContentPreview = ({
  open,
  onOpenChange,
  mediaType,
  mediaUrl,
  price,
  onPurchase,
  isUnlocked,
}: ContentPreviewProps) => {
  const renderPreview = () => {
    if (isUnlocked) {
      if (mediaType === 'image') {
        return (
          <img
            src={mediaUrl}
            alt="Content"
            className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
          />
        );
      }
      if (mediaType === 'video') {
        return (
          <video
            src={mediaUrl}
            controls
            className="w-full h-auto max-h-[60vh] rounded-lg"
          />
        );
      }
      if (mediaType === 'audio') {
        return (
          <audio src={mediaUrl} controls className="w-full" />
        );
      }
    }

    // Blurred preview for locked content
    return (
      <div className="relative w-full h-64 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
        <div className="absolute inset-0 backdrop-blur-3xl rounded-lg" />
        <div className="relative z-10 text-center space-y-4">
          <Lock className="h-16 w-16 mx-auto text-primary" />
          <div>
            <h3 className="text-xl font-semibold mb-2">Locked Content</h3>
            <p className="text-muted-foreground">
              Unlock to view this {mediaType}
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            ${price.toFixed(2)}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Content Preview
          </DialogTitle>
          <DialogDescription>
            {isUnlocked ? 'You have unlocked this content' : 'Purchase to unlock full access'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {renderPreview()}

          {!isUnlocked && (
            <div className="flex justify-between items-center pt-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Once purchased, you'll have permanent access
                </p>
              </div>
              <Button onClick={onPurchase} size="lg">
                <Lock className="h-4 w-4 mr-2" />
                Unlock for ${price.toFixed(2)}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
