import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface VoiceMessageProps {
  voiceUrl: string;
  duration: number;
  isSender: boolean;
}

export const VoiceMessage = ({ voiceUrl, duration, isSender }: VoiceMessageProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Card className={`p-3 ${isSender ? 'bg-primary text-primary-foreground' : ''}`}>
      <audio ref={audioRef} src={voiceUrl} preload="metadata" />
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant={isSender ? 'secondary' : 'ghost'}
          className="h-10 w-10 rounded-full"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </Button>
        <div className="flex-1 space-y-1">
          <div className="relative h-1 bg-background/20 rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 ${
                isSender ? 'bg-primary-foreground' : 'bg-primary'
              } transition-all duration-100`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs opacity-70">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
