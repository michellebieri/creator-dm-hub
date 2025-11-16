import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Upload, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function ContentUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [price, setPrice] = useState('9.99');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).slice(0, 20);
      setFiles(selectedFiles);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !user) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    let successCount = 0;
    let failCount = 0;

    try {
      // Create a dummy conversation for vault storage
      // We use a special pattern to identify vault-only content
      const { data: vaultConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          creator_id: user.id,
          customer_id: user.id, // Self-conversation for vault
        })
        .select('id')
        .single();

      if (convError) {
        // If conversation exists, try to find it
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('creator_id', user.id)
          .eq('customer_id', user.id)
          .limit(1)
          .single();

        if (!existing) throw new Error('Failed to create vault conversation');
        var vaultConversationId = existing.id;
      } else {
        var vaultConversationId = vaultConv.id;
      }

      // Process files in parallel batches of 5
      const batchSize = 5;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (file, batchIndex) => {
            const fileIndex = i + batchIndex;
            setCurrentFile(file.name);

            try {
              // Validate file size (100MB for videos, 10MB for images)
              const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
              if (file.size > maxSize) {
                throw new Error(`File ${file.name} is too large. Max size: ${maxSize / (1024 * 1024)}MB`);
              }

              // Upload to storage
              const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
              const { error: uploadError } = await supabase.storage
                .from('unlockables')
                .upload(fileName, file, {
                  cacheControl: '3600',
                  upsert: false
                });

              if (uploadError) throw uploadError;

              // Get public URL
              const { data: { publicUrl } } = supabase.storage
                .from('unlockables')
                .getPublicUrl(fileName);

              // Create message for this content
              const { data: message, error: messageError } = await supabase
                .from('messages')
                .insert({
                  conversation_id: vaultConversationId,
                  sender_id: user.id,
                  content: `Vault content: ${file.name}`,
                  message_type: 'unlockable',
                })
                .select('id')
                .single();

              if (messageError) throw messageError;

              // Determine media type
              const mediaType = file.type.startsWith('image/') ? 'image' : 
                               file.type.startsWith('video/') ? 'video' :
                               file.type.startsWith('audio/') ? 'audio' : 'document';

              // Create unlockable entry
              const { error: unlockableError } = await supabase
                .from('unlockables')
                .insert({
                  creator_id: user.id,
                  message_id: message.id,
                  media_url: publicUrl,
                  media_type: mediaType,
                  price: priceValue,
                });

              if (unlockableError) throw unlockableError;

              successCount++;
              setUploadProgress(Math.round(((fileIndex + 1) / files.length) * 100));
            } catch (err: any) {
              console.error(`Error uploading ${file.name}:`, err);
              failCount++;
              toast({
                title: `Failed to upload ${file.name}`,
                description: err.message || 'An error occurred',
                variant: "destructive",
              });
            }
          })
        );
      }

      if (successCount > 0) {
        toast({
          title: "Upload complete",
          description: `Successfully uploaded ${successCount} of ${files.length} file(s).`,
        });
        navigate('/vault');
      } else {
        throw new Error('All uploads failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setCurrentFile('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-14 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-screen-lg mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Upload Content</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4 space-y-4">
        <Card className="p-6 space-y-6">
          <div>
            <Label htmlFor="files">Select Files (up to 20)</Label>
            <Input
              id="files"
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={handleFileChange}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Max 100MB for videos, 10MB for images
            </p>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({files.length})</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This price will apply to all selected files
            </p>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              {currentFile && (
                <p className="text-xs text-muted-foreground truncate">
                  Current: {currentFile}
                </p>
              )}
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="w-full"
          >
            {uploading ? (
              'Uploading...'
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {files.length > 0 && `${files.length} file${files.length > 1 ? 's' : ''}`}
              </>
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
}
