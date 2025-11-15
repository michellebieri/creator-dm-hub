import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, ArrowLeft } from 'lucide-react';
import { contentUploadSchema, validateFile } from '@/lib/validation';

const ContentUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    mediaType: 'image' as 'image' | 'video' | 'audio' | 'document',
  });
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file using centralized validation
      const validation = validateFile(selectedFile, formData.mediaType);
      if (!validation.valid) {
        toast.error(validation.error);
        e.target.value = ''; // Clear input
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!user || !file) {
      toast.error('Please select a file');
      return;
    }

    // Validate form data with Zod
    const validation = contentUploadSchema.safeParse({
      title: formData.title,
      description: formData.description,
      price: parseFloat(formData.price),
      mediaType: formData.mediaType,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    const price = validation.data.price;

    setUploading(true);
    setProgress(0);

    try {
      // Create a dummy conversation for standalone content
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          creator_id: user.id,
          customer_id: user.id, // Self-reference for standalone content
          status: 'active',
        })
        .select()
        .single();

      if (convError) throw convError;

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      // Upload file with progress simulation
      const uploadPromise = supabase.storage
        .from('unlockables')
        .upload(fileName, file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { error: uploadError } = await uploadPromise;
      clearInterval(progressInterval);
      setProgress(100);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('unlockables')
        .getPublicUrl(fileName);

      // Create message
      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: formData.description || formData.title,
          message_type: 'text',
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Create unlockable
      const { error: unlockError } = await supabase
        .from('unlockables')
        .insert({
          message_id: message.id,
          media_type: formData.mediaType,
          media_url: urlData.publicUrl,
          price: price,
          creator_id: user.id,
        });

      if (unlockError) throw unlockError;

      toast.success('Content uploaded successfully!');
      navigate('/content-vault');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload content');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Upload className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Upload Content</h1>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter content title"
              disabled={uploading}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter content description"
              disabled={uploading}
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="mediaType">Media Type *</Label>
            <Select
              value={formData.mediaType}
              onValueChange={(value: any) => {
                setFormData({ ...formData, mediaType: value });
                setFile(null); // Reset file when type changes
              }}
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

          <div>
            <Label htmlFor="price">Price (USD) *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              disabled={uploading}
            />
          </div>

          <div>
            <Label htmlFor="file">File *</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileSelect}
              disabled={uploading}
              accept={
                formData.mediaType === 'image' ? 'image/*' :
                formData.mediaType === 'video' ? 'video/*' :
                formData.mediaType === 'audio' ? 'audio/*' :
                '.pdf,.doc,.docx'
              }
            />
            {file && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Uploading... {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="w-full"
          >
            {uploading ? 'Uploading...' : 'Upload Content'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ContentUpload;
