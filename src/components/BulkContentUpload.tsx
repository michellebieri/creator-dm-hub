import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FileItem {
  file: File;
  price: string;
  description: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
}

interface BulkContentUploadProps {
  conversationId: string;
  creatorId: string;
  onSuccess: () => void;
}

export const BulkContentUpload = ({ conversationId, creatorId, onSuccess }: BulkContentUploadProps) => {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [defaultPrice, setDefaultPrice] = useState('5');
  const [defaultMediaType, setDefaultMediaType] = useState<'image' | 'video' | 'audio' | 'document'>('image');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: FileItem[] = selectedFiles.map(file => ({
      file,
      price: defaultPrice,
      description: '',
      mediaType: defaultMediaType,
    }));
    setFiles([...files, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const updateFile = (index: number, updates: Partial<FileItem>) => {
    const newFiles = [...files];
    newFiles[index] = { ...newFiles[index], ...updates };
    setFiles(newFiles);
  };

  const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
  const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) return `${file.name} exceeds 200MB limit`;
    if (!ALLOWED_MIME_PREFIXES.some(p => file.type.startsWith(p))) return `${file.name} is not an allowed file type (images, video, audio only)`;
    return null;
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    // Validate all files before starting upload
    for (const { file } of files) {
      const err = validateFile(file);
      if (err) { toast.error(err); return; }
    }

    setUploading(true);
    setProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const { file, price, description, mediaType } = files[i];

        // Upload file
        const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
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
            content: description || `Unlockable content ${i + 1}`,
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
          });

        if (unlockableError) throw unlockableError;

        setProgress(((i + 1) / files.length) * 100);
      }

      toast.success(`Successfully uploaded ${files.length} files!`);
      setFiles([]);
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error uploading:', error);
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Content Upload</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Default Price ($)</Label>
              <Input
                type="number"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label>Default Media Type</Label>
              <Select value={defaultMediaType} onValueChange={(v: any) => setDefaultMediaType(v)}>
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
          </div>

          <div>
            <Label>Select Files</Label>
            <Input
              type="file"
              multiple
              onChange={handleFileSelect}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              disabled={uploading}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Select multiple files to upload at once
            </p>
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Files to Upload ({files.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {files.map((item, index) => (
                  <div key={index} className="flex gap-2 p-3 bg-muted/50 rounded-lg">
                    <Lock className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium truncate">{item.file.name}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateFile(index, { price: e.target.value })}
                          placeholder="Price"
                          disabled={uploading}
                          min="0"
                          step="0.01"
                        />
                        <Select
                          value={item.mediaType}
                          onValueChange={(v: any) => updateFile(index, { mediaType: v })}
                          disabled={uploading}
                        >
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
                      <Input
                        value={item.description}
                        onChange={(e) => updateFile(index, { description: e.target.value })}
                        placeholder="Description (optional)"
                        disabled={uploading}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploading && (
            <div>
              <Label>Upload Progress</Label>
              <Progress value={progress} className="mt-2" />
              <p className="text-sm text-muted-foreground mt-1">
                Uploading... {Math.round(progress)}%
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
              {uploading ? 'Uploading...' : `Upload ${files.length} Files`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
