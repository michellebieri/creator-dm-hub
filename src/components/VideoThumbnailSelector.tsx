import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Play, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoThumbnailSelectorProps {
  videoFile: File;
  onThumbnailSelect: (thumbnailBlob: Blob) => void;
  selectedThumbnail?: Blob | null;
}

export function VideoThumbnailSelector({ 
  videoFile, 
  onThumbnailSelect,
  selectedThumbnail 
}: VideoThumbnailSelectorProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateThumbnails();
    return () => {
      // Cleanup object URLs
      thumbnails.forEach(url => URL.revokeObjectURL(url));
    };
  }, [videoFile]);

  const generateThumbnails = async () => {
    setGenerating(true);
    setThumbnails([]);
    setSelectedIndex(null);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;

    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        video.currentTime = 0;
        resolve();
      };
    });

    const duration = video.duration;
    const numThumbnails = 6;
    const interval = duration / (numThumbnails + 1);
    const newThumbnails: string[] = [];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setGenerating(false);
      URL.revokeObjectURL(videoUrl);
      return;
    }

    for (let i = 1; i <= numThumbnails; i++) {
      const time = interval * i;
      video.currentTime = time;

      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      newThumbnails.push(dataUrl);
    }

    URL.revokeObjectURL(videoUrl);
    setThumbnails(newThumbnails);
    setGenerating(false);
    
    // Auto-select the first thumbnail as default
    if (newThumbnails.length > 0) {
      setSelectedIndex(0);
      // Convert first thumbnail to blob and notify parent
      const response = await fetch(newThumbnails[0]);
      const blob = await response.blob();
      onThumbnailSelect(blob);
    }
  };

  const handleSelect = async (index: number) => {
    setSelectedIndex(index);
    
    // Convert data URL to Blob
    const dataUrl = thumbnails[index];
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    onThumbnailSelect(blob);
  };

  if (generating) {
    return (
      <div className="space-y-2">
        <Label>Video Thumbnail</Label>
        <div className="flex items-center justify-center h-24 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-sm">Generating thumbnails...</span>
          </div>
        </div>
      </div>
    );
  }

  if (thumbnails.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label>Select Thumbnail</Label>
      <div className="grid grid-cols-3 gap-2">
        {thumbnails.map((thumbnail, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleSelect(index)}
            className={cn(
              "relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:opacity-90",
              selectedIndex === index 
                ? "border-primary ring-2 ring-primary ring-offset-2" 
                : "border-transparent hover:border-muted-foreground/30"
            )}
          >
            <img 
              src={thumbnail} 
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {selectedIndex === index && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <div className="bg-primary rounded-full p-1">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Click on an image to select it as the thumbnail
      </p>
    </div>
  );
}
