import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface ContentItem {
  id: string;
  media_type: string;
  media_url: string;
  caption?: string | null;
  title?: string | null;
}

interface ContentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: ContentItem[];
  initialIndex?: number;
}

export const ContentViewer = ({ open, onOpenChange, content, initialIndex = 0 }: ContentViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const currentItem = content[currentIndex];
  const hasMultiple = content.length > 1;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : content.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < content.length - 1 ? prev + 1 : 0));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') onOpenChange(false);
  };

  if (!currentItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 bg-black border-0"
        onKeyDown={handleKeyDown}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Counter */}
        {hasMultiple && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {currentIndex + 1} of {content.length}
          </div>
        )}

        {/* Navigation arrows */}
        {hasMultiple && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12"
              onClick={goToNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Content */}
        <div className="flex items-center justify-center w-full h-full p-4">
          {currentItem.media_type === 'image' ? (
            <img
              src={currentItem.media_url}
              alt={currentItem.caption || currentItem.title || 'Content'}
              className="max-w-full max-h-full object-contain"
            />
          ) : currentItem.media_type === 'video' ? (
            <video
              src={currentItem.media_url}
              controls
              autoPlay
              className="max-w-full max-h-full"
            />
          ) : currentItem.media_type === 'audio' ? (
            <div className="text-white text-center">
              <p className="mb-4">{currentItem.caption || currentItem.title || 'Audio'}</p>
              <audio src={currentItem.media_url} controls autoPlay className="w-full max-w-md" />
            </div>
          ) : (
            <div className="text-white text-center">
              <p>Document: {currentItem.caption || currentItem.title || 'Content'}</p>
              <a 
                href={currentItem.media_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Open Document
              </a>
            </div>
          )}
        </div>

        {/* Caption */}
        {(currentItem.caption || currentItem.title) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-white text-center bg-black/50 px-4 py-2 rounded-lg max-w-lg">
            {currentItem.title && <p className="font-semibold">{currentItem.title}</p>}
            {currentItem.caption && <p className="text-sm text-white/80">{currentItem.caption}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
