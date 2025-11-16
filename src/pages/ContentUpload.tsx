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
  const [debugErrors, setDebugErrors] = useState<Array<{
    fileName: string;
    step: string;
    error: string;
    details?: any;
  }>>([]);

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
    // Clear previous errors
    setDebugErrors([]);
    
    if (files.length === 0 || !user) {
      setDebugErrors([{
        fileName: 'N/A',
        step: 'Validation',
        error: !user ? 'User not authenticated' : 'No files selected',
        details: { userId: user?.id, filesCount: files.length }
      }]);
      toast({
        title: "Upload error",
        description: !user ? "You must be logged in to upload" : "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      setDebugErrors([{
        fileName: 'N/A',
        step: 'Validation',
        error: 'Invalid price value',
        details: { price, parsedPrice: priceValue }
      }]);
      toast({
        title: "Invalid price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive",
      });
      return;
    }

    console.log('=== UPLOAD START ===');
    console.log('User ID:', user.id);
    console.log('Files to upload:', files.length);
    console.log('Price:', priceValue);
    
    setUploading(true);
    setUploadProgress(0);
    let successCount = 0;
    let failCount = 0;
    const errors: typeof debugErrors = [];

    try {
      // Step 1: Get or create vault conversation
      console.log('Step 1: Getting/creating vault conversation...');
      const { data: vaultConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          creator_id: user.id,
          customer_id: user.id, // Self-conversation for vault
        })
        .select('id')
        .single();

      if (convError) {
        console.log('Conversation insert failed, trying to find existing:', convError);
        // If conversation exists, try to find it
        const { data: existing, error: findError } = await supabase
          .from('conversations')
          .select('id')
          .eq('creator_id', user.id)
          .eq('customer_id', user.id)
          .limit(1)
          .single();

        if (!existing || findError) {
          errors.push({
            fileName: 'N/A',
            step: 'Conversation Setup',
            error: findError?.message || 'Failed to create or find vault conversation',
            details: { convError, findError }
          });
          throw new Error('Failed to create vault conversation: ' + (findError?.message || convError.message));
        }
        var vaultConversationId = existing.id;
        console.log('Found existing conversation:', vaultConversationId);
      } else {
        var vaultConversationId = vaultConv.id;
        console.log('Created new conversation:', vaultConversationId);
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
              console.log(`\n=== Processing file ${fileIndex + 1}/${files.length}: ${file.name} ===`);
              
              // Step 2: Validate file size
              const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
              console.log(`File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB, Max: ${maxSize / (1024 * 1024)}MB`);
              
              if (file.size > maxSize) {
                const error = `File too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Max: ${maxSize / (1024 * 1024)}MB`;
                errors.push({
                  fileName: file.name,
                  step: 'File Validation',
                  error,
                  details: { fileSize: file.size, maxSize, fileType: file.type }
                });
                throw new Error(error);
              }

              // Step 3: Upload to storage
              const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
              const fileName = `${user.id}/${Date.now()}-${sanitizedName}`;
              console.log(`Step 3: Uploading to storage: unlockables/${fileName}`);
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('unlockables')
                .upload(fileName, file, {
                  cacheControl: '3600',
                  upsert: false
                });

              if (uploadError) {
                console.error('Storage upload error:', uploadError);
                errors.push({
                  fileName: file.name,
                  step: 'Storage Upload',
                  error: uploadError.message,
                  details: { 
                    fileName, 
                    bucket: 'unlockables',
                    userId: user.id,
                    errorDetails: uploadError
                  }
                });
                throw new Error(`Storage upload failed: ${uploadError.message}`);
              }
              
              console.log('Storage upload successful:', uploadData?.path);

              // Step 4: Get public URL
              const { data: { publicUrl } } = supabase.storage
                .from('unlockables')
                .getPublicUrl(fileName);
              console.log('Step 4: Public URL generated:', publicUrl);

              // Step 5: Create message
              console.log('Step 5: Creating message in database...');
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

              if (messageError) {
                console.error('Message creation error:', messageError);
                errors.push({
                  fileName: file.name,
                  step: 'Message Creation',
                  error: messageError.message,
                  details: {
                    conversationId: vaultConversationId,
                    senderId: user.id,
                    errorCode: messageError.code,
                    errorDetails: messageError
                  }
                });
                throw new Error(`Failed to create message: ${messageError.message}`);
              }

              console.log('Message created successfully:', message.id);

              // Step 6: Create unlockable
              const mediaType = file.type.startsWith('image/') ? 'image' : 
                               file.type.startsWith('video/') ? 'video' :
                               file.type.startsWith('audio/') ? 'audio' : 'document';
              
              console.log('Step 6: Creating unlockable entry...');
              const { error: unlockableError } = await supabase
                .from('unlockables')
                .insert({
                  creator_id: user.id,
                  message_id: message.id,
                  media_url: publicUrl,
                  media_type: mediaType,
                  price: priceValue,
                });

              if (unlockableError) {
                console.error('Unlockable creation error:', unlockableError);
                errors.push({
                  fileName: file.name,
                  step: 'Unlockable Creation',
                  error: unlockableError.message,
                  details: {
                    creatorId: user.id,
                    messageId: message.id,
                    mediaType,
                    price: priceValue,
                    errorCode: unlockableError.code,
                    errorDetails: unlockableError
                  }
                });
                throw new Error(`Failed to create unlockable: ${unlockableError.message}`);
              }

              console.log('✓ Unlockable created successfully!');

              successCount++;
              setUploadProgress(Math.round(((fileIndex + 1) / files.length) * 100));
              console.log(`✓ File ${fileIndex + 1}/${files.length} uploaded successfully\n`);
            } catch (err: any) {
              console.error(`✗ Error uploading ${file.name}:`, err);
              failCount++;
              
              // Add to errors array if not already added
              if (!errors.find(e => e.fileName === file.name)) {
                errors.push({
                  fileName: file.name,
                  step: 'Unknown',
                  error: err.message || 'Unknown error',
                  details: err
                });
              }
              
              // Show specific error to user
              let errorMessage = err.message || 'An error occurred';
              if (errorMessage.includes('Storage')) {
                errorMessage = 'Storage upload failed. Check permissions and try again.';
              } else if (errorMessage.includes('too large')) {
                errorMessage = `File too large. Max: 100MB (videos), 10MB (images)`;
              }
              
              toast({
                title: `Failed: ${file.name}`,
                description: errorMessage,
                variant: "destructive",
              });
            }
          })
        );
      }

      if (successCount > 0) {
        console.log('=== UPLOAD COMPLETE ===');
        console.log(`Success: ${successCount}/${files.length}`);
        toast({
          title: "Upload complete",
          description: `Successfully uploaded ${successCount} of ${files.length} file(s).`,
        });
        setDebugErrors([]);
        navigate('/vault');
      } else {
        console.error('=== ALL UPLOADS FAILED ===');
        setDebugErrors(errors);
        throw new Error(`All ${files.length} upload(s) failed. See details below.`);
      }
    } catch (error: any) {
      console.error('Upload process error:', error);
      
      // Save errors to state for UI display
      if (errors.length > 0) {
        setDebugErrors(errors);
      }
      
      // Only show general error if no files succeeded
      if (successCount === 0) {
        toast({
          title: "Upload failed",
          description: errors.length > 0 ? 'Check error details below' : (error.message || 'Unable to upload files'),
          variant: "destructive",
        });
      }
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

        {/* Debug Error Display */}
        {debugErrors.length > 0 && (
          <Card className="p-6 border-destructive bg-destructive/5">
            <h3 className="text-lg font-semibold text-destructive mb-4">
              Upload Error Details
            </h3>
            <div className="space-y-4">
              {debugErrors.map((error, index) => (
                <div key={index} className="bg-background p-4 rounded-lg border border-destructive/20">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-destructive min-w-[100px]">File:</span>
                      <span className="text-foreground">{error.fileName}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-destructive min-w-[100px]">Failed at:</span>
                      <span className="text-foreground font-semibold">{error.step}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-destructive min-w-[100px]">Error:</span>
                      <span className="text-foreground">{error.error}</span>
                    </div>
                    {error.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                          Technical Details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                          {JSON.stringify(error.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Tip:</strong> Open the browser console (F12) for more detailed logs
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
