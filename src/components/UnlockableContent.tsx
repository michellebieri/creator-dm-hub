import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Image, Video, Music, FileText } from 'lucide-react';
import { useUnlockables } from '@/hooks/useUnlockables';

interface UnlockableContentProps {
  unlockable: {
    id: string;
    message_id: string;
    media_type: 'image' | 'video' | 'audio' | 'document';
    media_url: string;
    price: number;
    creator_id: string;
    unlocked_by: string[] | null;
  };
}

export const UnlockableContent = ({ unlockable }: UnlockableContentProps) => {
  const { unlockContent, isUnlocked, loading } = useUnlockables();
  const [unlocked, setUnlocked] = useState(isUnlocked(unlockable));

  const handleUnlock = async () => {
    const result = await unlockContent(unlockable.id, unlockable.price, unlockable.creator_id);
    if (result) {
      setUnlocked(true);
    }
  };

  const getMediaIcon = () => {
    switch (unlockable.media_type) {
      case 'image':
        return <Image className="h-12 w-12" />;
      case 'video':
        return <Video className="h-12 w-12" />;
      case 'audio':
        return <Music className="h-12 w-12" />;
      case 'document':
        return <FileText className="h-12 w-12" />;
    }
  };

  const renderContent = () => {
    if (!unlocked) {
      return (
        <div className="flex flex-col items-center justify-center p-8 gap-4">
          <Lock className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Locked Content</p>
          <Button onClick={handleUnlock} disabled={loading}>
            Unlock for {unlockable.price} credits
          </Button>
        </div>
      );
    }

    switch (unlockable.media_type) {
      case 'image':
        return <img src={unlockable.media_url} alt="Unlocked content" className="w-full rounded" />;
      case 'video':
        return (
          <video controls className="w-full rounded">
            <source src={unlockable.media_url} />
          </video>
        );
      case 'audio':
        return (
          <audio controls className="w-full">
            <source src={unlockable.media_url} />
          </audio>
        );
      case 'document':
        return (
          <a
            href={unlockable.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <FileText className="h-5 w-5" />
            View Document
          </a>
        );
    }
  };

  return (
    <Card className="overflow-hidden">
      {!unlocked && (
        <div className="bg-muted/50 p-4 flex items-center gap-3">
          {getMediaIcon()}
          <div>
            <p className="font-semibold">Premium Content</p>
            <p className="text-sm text-muted-foreground">{unlockable.price} credits to unlock</p>
          </div>
        </div>
      )}
      <div className="p-4">{renderContent()}</div>
    </Card>
  );
};
