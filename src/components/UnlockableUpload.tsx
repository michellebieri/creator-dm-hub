import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UnlockableUploadProps {
  conversationId: string;
  creatorId: string;
  onSuccess: () => void;
}

export const UnlockableUpload = ({ conversationId, creatorId, onSuccess }: UnlockableUploadProps) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | 'document'>('image');
  const [price, setPrice] = useState('5');
  const [file, setFile] = useState<File | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');

  const handleUpload = async () => {
    if (!file || !messageContent.trim()) {
      toast.error('Please provide a message and select a file');
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${creatorId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('unlockables')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('unlockables')
        .getPublicUrl(filePath);

      // Create message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: creatorId,
          content: messageContent,
          message_type: 'unlockable',
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Create unlockable
      const { error: unlockableError } = await supabase
        .from('unlockables')
        .insert({
          message_id: message.id,
          creator_id: creatorId,
          media_type: mediaType,
          media_url: publicUrl,
          price: parseFloat(price),
          title: title.trim() || null,
          caption: caption.trim() || null,
        });

      if (unlockableError) throw unlockableError;

      toast.success('Unlockable content sent!');
      setOpen(false);
      setFile(null);
      setMessageContent('');
      setTitle('');
      setCaption('');
      onSuccess();
    } catch (error: any) {
      console.error('Error uploading:', error);
      toast.error(error.message || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Lock className="h-4 w-4 mr-2" />
          Send Unlockable
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Unlockable Content</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title (optional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Beach Day, Workout Video"
              maxLength={100}
            />
          </div>

          <div>
            <Label>Caption (optional)</Label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a description..."
              maxLength={200}
            />
          </div>

          <div>
            <Label>Message</Label>
            <Input
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Describe the unlockable content..."
            />
          </div>
          
          <div>
            <Label>Media Type</Label>
            <Select value={mediaType} onValueChange={(v: any) => setMediaType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="document">Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Price (Credits)</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div>
            <Label>File</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept={
                mediaType === 'image' ? 'image/*' :
                mediaType === 'video' ? 'video/*' :
                mediaType === 'audio' ? 'audio/*' :
                '.pdf,.doc,.docx'
              }
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || !file || !messageContent.trim()}
            className="w-full"
          >
            {uploading ? (
              <>Uploading...</>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Send Unlockable Content
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
