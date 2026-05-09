import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Upload, X, Video, Package, FileImage } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { VideoThumbnailSelector } from '@/components/VideoThumbnailSelector';

interface VideoThumbnail {
  fileIndex: number;
  blob: Blob;
}

type UploadMode = 'single' | 'bundle';

export default function ContentUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Mode
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');

  // Files
  const [files, setFiles] = useState<File[]>([]);
  const [videoThumbnails, setVideoThumbnails] = useState<Map<number, Blob>>(new Map());

  // Pricing / settings
  const [price, setPrice] = useState('9.99');
  const [freeForSubscribers, setFreeForSubscribers] = useState(false);

  // Bundle-specific
  const [bundleTitle, setBundleTitle] = useState('');
  const [bundleDescription, setBundleDescription] = useState('');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [debugErrors, setDebugErrors] = useState<Array<{
    fileName: string;
    step: string;
    error: string;
    details?: any;
  }>>([]);

  const MAX_FILE_SIZE_VIDEO = 500 * 1024 * 1024; // 500 MB
  const MAX_FILE_SIZE_OTHER = 25 * 1024 * 1024;  // 25 MB
  const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).slice(0, 20);
    const invalid = selected.find(
      f => !ALLOWED_MIME_PREFIXES.some(p => f.type.startsWith(p))
    );
    if (invalid) {
      alert(`${invalid.name} is not allowed. Only images, video, and audio files are accepted.`);
      return;
    }
    setFiles(selected);
    setVideoThumbnails(new Map());
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    const next = new Map<number, Blob>();
    videoThumbnails.forEach((blob, k) => {
      if (k < index) next.set(k, blob);
      else if (k > index) next.set(k - 1, blob);
    });
    setVideoThumbnails(next);
  };

  // Upload a single file to storage and return its public URL
  const uploadFileToStorage = async (file: File, userId: string) => {
    const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${userId}/${Date.now()}-${sanitized}`;
    const { data, error } = await supabase.storage
      .from('unlockables')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    const { data: { publicUrl } } = supabase.storage.from('unlockables').getPublicUrl(path);
    return { path, publicUrl };
  };

  // Upload a thumbnail blob and return its public URL (or null on failure)
  const uploadThumbnail = async (blob: Blob, userId: string, baseName: string) => {
    const path = `${userId}/${Date.now()}-thumb-${baseName}.jpg`;
    const { error } = await supabase.storage
      .from('unlockables')
      .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from('unlockables').getPublicUrl(path);
    return publicUrl;
  };

  const handleUpload = async () => {
    setDebugErrors([]);

    if (!user) {
      toast({ title: 'Not logged in', description: 'You must be logged in to upload.', variant: 'destructive' });
      return;
    }
    if (files.length === 0) {
      toast({ title: 'No files selected', description: 'Please select at least one file.', variant: 'destructive' });
      return;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast({ title: 'Invalid price', description: 'Please enter a valid price greater than $0.', variant: 'destructive' });
      return;
    }

    if (uploadMode === 'bundle' && !bundleTitle.trim()) {
      toast({ title: 'Bundle title required', description: 'Please enter a title for the bundle.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const errors: typeof debugErrors = [];
    let successCount = 0;

    try {
      if (uploadMode === 'single') {
        // ── SINGLE MODE: each file → its own unlockable ──────────────────────
        const batchSize = 5;
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);

          await Promise.all(
            batch.map(async (file, bi) => {
              const fileIndex = i + bi;
              setCurrentFile(file.name);

              try {
                const maxSize = file.type.startsWith('video/') ? MAX_FILE_SIZE_VIDEO : MAX_FILE_SIZE_OTHER;
                if (file.size > maxSize) {
                  throw new Error(
                    `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: ${maxSize / 1024 / 1024} MB`
                  );
                }

                const { publicUrl } = await uploadFileToStorage(file, user.id);

                const mediaType = file.type.startsWith('image/') ? 'image'
                  : file.type.startsWith('video/') ? 'video'
                  : 'audio';

                let thumbnailUrl: string | null = null;
                if (mediaType === 'video' && videoThumbnails.has(fileIndex)) {
                  const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                  thumbnailUrl = await uploadThumbnail(videoThumbnails.get(fileIndex)!, user.id, sanitized);
                }

                const { error: unlockableError } = await supabase.from('unlockables').insert({
                  creator_id: user.id,
                  message_id: null,
                  media_url: publicUrl,
                  media_type: mediaType,
                  price: priceValue,
                  free_for_subscribers: freeForSubscribers,
                  thumbnail_url: thumbnailUrl,
                });

                if (unlockableError) {
                  throw new Error(`Database error: ${unlockableError.message}`);
                }

                successCount++;
                setUploadProgress(Math.round(((fileIndex + 1) / files.length) * 100));
              } catch (err: any) {
                errors.push({ fileName: file.name, step: 'Upload', error: err.message, details: err });
                toast({ title: `Failed: ${file.name}`, description: err.message, variant: 'destructive' });
              }
            })
          );
        }

      } else {
        // ── BUNDLE MODE: all files → one content_bundle ──────────────────────
        const unlockableIds: string[] = [];

        for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
          const file = files[fileIndex];
          setCurrentFile(file.name);

          try {
            const maxSize = file.type.startsWith('video/') ? MAX_FILE_SIZE_VIDEO : MAX_FILE_SIZE_OTHER;
            if (file.size > maxSize) {
              throw new Error(
                `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: ${maxSize / 1024 / 1024} MB`
              );
            }

            const { publicUrl } = await uploadFileToStorage(file, user.id);

            const mediaType = file.type.startsWith('image/') ? 'image'
              : file.type.startsWith('video/') ? 'video'
              : 'audio';

            let thumbnailUrl: string | null = null;
            if (mediaType === 'video' && videoThumbnails.has(fileIndex)) {
              const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
              thumbnailUrl = await uploadThumbnail(videoThumbnails.get(fileIndex)!, user.id, sanitized);
            }

            const { data: unlockable, error: unlockableError } = await supabase
              .from('unlockables')
              .insert({
                creator_id: user.id,
                message_id: null,
                media_url: publicUrl,
                media_type: mediaType,
                price: 0, // bundle sets the price; individual items are $0 inside
                free_for_subscribers: freeForSubscribers,
                thumbnail_url: thumbnailUrl,
              })
              .select('id')
              .single();

            if (unlockableError || !unlockable) {
              throw new Error(`Database error: ${unlockableError?.message}`);
            }

            unlockableIds.push(unlockable.id);
            successCount++;
            setUploadProgress(Math.round(((fileIndex + 1) / (files.length + 1)) * 100));
          } catch (err: any) {
            errors.push({ fileName: file.name, step: 'Upload', error: err.message, details: err });
            toast({ title: `Failed: ${file.name}`, description: err.message, variant: 'destructive' });
          }
        }

        if (unlockableIds.length > 0) {
          // Create the bundle record
          const { data: bundle, error: bundleError } = await supabase
            .from('content_bundles')
            .insert({
              creator_id: user.id,
              title: bundleTitle.trim(),
              description: bundleDescription.trim() || null,
              price: priceValue,
            })
            .select('id')
            .single();

          if (bundleError || !bundle) {
            throw new Error(`Failed to create bundle: ${bundleError?.message}`);
          }

          // Link each unlockable to the bundle
          const bundleContents = unlockableIds.map(uid => ({
            bundle_id: bundle.id,
            unlockable_id: uid,
          }));

          const { error: contentsError } = await supabase
            .from('bundle_contents')
            .insert(bundleContents);

          if (contentsError) {
            throw new Error(`Failed to link bundle contents: ${contentsError.message}`);
          }

          setUploadProgress(100);
        }
      }

      if (successCount > 0) {
        toast({
          title: uploadMode === 'bundle' ? 'Bundle uploaded!' : 'Upload complete',
          description: uploadMode === 'bundle'
            ? `Bundle "${bundleTitle}" created with ${successCount} file${successCount !== 1 ? 's' : ''}.`
            : `Successfully uploaded ${successCount} of ${files.length} file${files.length !== 1 ? 's' : ''}.`,
        });
        setDebugErrors([]);
        navigate('/vault');
      } else {
        setDebugErrors(errors);
        toast({ title: 'Upload failed', description: 'No files were uploaded. See details below.', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      if (errors.length > 0) setDebugErrors(errors);
      toast({ title: 'Upload failed', description: error.message || 'Something went wrong.', variant: 'destructive' });
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

        {/* Upload Mode Toggle */}
        <Card className="p-4">
          <Label className="text-sm font-medium mb-3 block">Upload Type</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setUploadMode('single')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                uploadMode === 'single'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40'
              }`}
            >
              <FileImage className={`h-6 w-6 ${uploadMode === 'single' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-medium ${uploadMode === 'single' ? 'text-primary' : 'text-foreground'}`}>
                Single Files
              </span>
              <span className="text-xs text-muted-foreground text-center">
                Each file sold separately at the same price
              </span>
            </button>

            <button
              type="button"
              onClick={() => setUploadMode('bundle')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                uploadMode === 'bundle'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40'
              }`}
            >
              <Package className={`h-6 w-6 ${uploadMode === 'bundle' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-medium ${uploadMode === 'bundle' ? 'text-primary' : 'text-foreground'}`}>
                Bundle
              </span>
              <span className="text-xs text-muted-foreground text-center">
                All files sold together as one package
              </span>
            </button>
          </div>
        </Card>

        <Card className="p-6 space-y-6">

          {/* Bundle-specific fields */}
          {uploadMode === 'bundle' && (
            <div className="space-y-4 pb-4 border-b border-border">
              <div>
                <Label htmlFor="bundleTitle">Bundle Title <span className="text-destructive">*</span></Label>
                <Input
                  id="bundleTitle"
                  type="text"
                  placeholder="e.g. Beach Photoshoot Pack"
                  value={bundleTitle}
                  onChange={(e) => setBundleTitle(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="bundleDescription">Bundle Description (optional)</Label>
                <Textarea
                  id="bundleDescription"
                  placeholder="Describe what's included in this bundle..."
                  value={bundleDescription}
                  onChange={(e) => setBundleDescription(e.target.value)}
                  className="mt-2 resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* File Picker */}
          <div>
            <Label htmlFor="files">
              {uploadMode === 'bundle' ? 'Select Bundle Files (up to 20)' : 'Select Files (up to 20)'}
            </Label>
            <Input
              id="files"
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={handleFileChange}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Max 500 MB for videos · Max 25 MB for images and audio
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-4">
              <Label>Selected Files ({files.length})</Label>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {files.map((file, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {file.type.startsWith('video/') && (
                          <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB · {file.type}
                          </p>
                        </div>
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

                    {file.type.startsWith('video/') && (
                      <VideoThumbnailSelector
                        videoFile={file}
                        onThumbnailSelect={(blob) => {
                          setVideoThumbnails(prev => {
                            const next = new Map(prev);
                            next.set(index, blob);
                            return next;
                          });
                        }}
                        selectedThumbnail={videoThumbnails.get(index)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price */}
          <div>
            <Label htmlFor="price">
              {uploadMode === 'bundle' ? 'Bundle Price ($)' : 'Price per File ($)'}
            </Label>
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
              {uploadMode === 'bundle'
                ? 'Fans pay this once to unlock all files in the bundle'
                : 'Each file is sold individually at this price'}
            </p>
          </div>

          {/* Free for subscribers */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="freeForSubscribers"
                checked={freeForSubscribers}
                onChange={(e) => setFreeForSubscribers(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <Label htmlFor="freeForSubscribers" className="text-sm font-normal cursor-pointer">
                Free for Subscribers
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              Subscribers can view this content without paying
            </p>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {uploadMode === 'bundle' ? 'Building bundle...' : 'Uploading...'}
                </span>
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

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="w-full"
          >
            {uploading ? (
              uploadMode === 'bundle' ? 'Creating Bundle...' : 'Uploading...'
            ) : (
              <>
                {uploadMode === 'bundle' ? (
                  <Package className="h-4 w-4 mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploadMode === 'bundle'
                  ? `Create Bundle${files.length > 0 ? ` (${files.length} file${files.length !== 1 ? 's' : ''})` : ''}`
                  : `Upload${files.length > 0 ? ` ${files.length} file${files.length !== 1 ? 's' : ''}` : ''}`}
              </>
            )}
          </Button>
        </Card>

        {/* Error Details */}
        {debugErrors.length > 0 && (
          <Card className="p-6 border-destructive bg-destructive/5">
            <h3 className="text-lg font-semibold text-destructive mb-4">Upload Error Details</h3>
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
          </Card>
        )}
      </div>
    </div>
  );
}
