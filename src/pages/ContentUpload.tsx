import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Upload } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function ContentUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [price, setPrice] = useState('9.99');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).slice(0, 20);
      setFiles(selectedFiles);
    }
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

    setUploading(true);

    try {
      // Get or create vault conversation
      let vaultConversationId: string;
      
      // First, try to find existing vault conversation
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('creator_id', user.id)
        .eq('customer_id', user.id)
        .single();

      if (existingConversation) {
        vaultConversationId = existingConversation.id;
      } else {
        // Create new vault conversation
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            creator_id: user.id,
            customer_id: user.id,
          })
          .select('id')
          .single();

        if (convError) throw convError;
        vaultConversationId = conversation.id;
      }

      // Upload each file
      for (const file of files) {
        const fileName = `vault/${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('unlockables')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('unlockables')
          .getPublicUrl(fileName);

        // Create message
        const { data: message, error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: vaultConversationId,
            sender_id: user.id,
            content: 'Vault content',
            message_type: 'text',
          })
          .select('id')
          .single();

        if (messageError) throw messageError;

        // Create unlockable
        const mediaType = file.type.startsWith('image/') ? 'image' : 
                         file.type.startsWith('video/') ? 'video' : 'document';

        const { error: unlockableError } = await supabase
          .from('unlockables')
          .insert({
            creator_id: user.id,
            message_id: message.id,
            media_url: publicUrl,
            media_type: mediaType,
            price: parseFloat(price),
          });

        if (unlockableError) throw unlockableError;
      }

      toast({
        title: "Upload successful",
        description: `${files.length} file(s) uploaded to your vault.`,
      });

      navigate('/vault');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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

      <div className="max-w-screen-lg mx-auto p-4">
        <Card className="p-6 space-y-6">
          <div>
            <Label htmlFor="files">Select Files (up to 20)</Label>
            <Input
              id="files"
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="mt-2"
            />
            {files.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {files.length} file(s) selected
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-2"
            />
          </div>

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
                Upload {files.length > 0 && `(${files.length})`}
              </>
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
}
