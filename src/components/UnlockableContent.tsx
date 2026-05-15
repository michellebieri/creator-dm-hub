import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Image as ImageIcon, Video, Music, FileText, Sparkles } from 'lucide-react';
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

  const mediaLabel =
    unlockable.media_type === 'image' ? 'Photo'
    : unlockable.media_type === 'video' ? 'Video'
    : unlockable.media_type === 'audio' ? 'Voice note'
    : 'Document';

  const MediaIcon =
    unlockable.media_type === 'image' ? ImageIcon
    : unlockable.media_type === 'video' ? Video
    : unlockable.media_type === 'audio' ? Music
    : FileText;

  if (!unlocked) {
    return (
      <Card className="relative overflow-hidden border-0 shadow-lg">
        {/* Premium gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500" />
        {/* Frosted blur layer to suggest hidden media beneath */}
        <div className="absolute inset-0 backdrop-blur-2xl bg-black/30" />
        {/* Subtle shimmer */}
        <div className="absolute -inset-1 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)] pointer-events-none" />

        <div className="relative flex flex-col items-center justify-center gap-3 px-6 py-10 text-white">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/30">
            <Lock className="h-7 w-7" />
          </div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
            <Sparkles className="h-3.5 w-3.5" />
            Premium {mediaLabel}
          </div>
          <p className="text-sm opacity-90 text-center max-w-[18rem]">
            Unlock to view this exclusive content
          </p>
          <Button
            onClick={handleUnlock}
            disabled={loading}
            size="lg"
            className="mt-2 bg-white text-black hover:bg-white/90 font-semibold shadow-md"
          >
            <MediaIcon className="h-4 w-4 mr-2" />
            Unlock for ${unlockable.price.toFixed(2)}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-2">
        {unlockable.media_type === 'image' && (
          <img src={unlockable.media_url} alt="Unlocked content" className="w-full rounded" />
        )}
        {unlockable.media_type === 'video' && (
          <video controls className="w-full rounded">
            <source src={unlockable.media_url} />
          </video>
        )}
        {unlockable.media_type === 'audio' && (
          <audio controls className="w-full">
            <source src={unlockable.media_url} />
          </audio>
        )}
        {unlockable.media_type === 'document' && (
          <a
            href={unlockable.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline p-3"
          >
            <FileText className="h-5 w-5" />
            View Document
          </a>
        )}
      </div>
    </Card>
  );
};
