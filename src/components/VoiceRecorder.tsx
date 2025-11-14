import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onSendVoice: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean;
}

export const VoiceRecorder = ({ onSendVoice, disabled }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setAudioBlob(null);
      setDuration(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onSendVoice(audioBlob, duration);
      setAudioBlob(null);
      setDuration(0);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (audioBlob) {
    return (
      <div className="flex items-center gap-2 p-2 bg-accent rounded-lg">
        <audio src={URL.createObjectURL(audioBlob)} controls className="flex-1" />
        <span className="text-sm text-muted-foreground">{formatDuration(duration)}</span>
        <Button size="icon" variant="ghost" onClick={handleSend}>
          <Send className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={cancelRecording}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
          <span className="text-sm font-medium">Recording...</span>
          <span className="text-sm text-muted-foreground">{formatDuration(duration)}</span>
        </div>
        <Button size="icon" variant="ghost" onClick={stopRecording}>
          <Square className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={startRecording}
      disabled={disabled}
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
};
