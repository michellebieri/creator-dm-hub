import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Verification {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  verified_at: string | null;
  submitted_at: string;
  documents_url: string | null;
  rejection_reason: string | null;
}

const CreatorVerification = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [documentsUrl, setDocumentsUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchVerification();
    }
  }, [user]);

  const fetchVerification = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('creator_verifications')
        .select('*')
        .eq('creator_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setVerification(data as Verification);
      if (data?.documents_url) {
        setDocumentsUrl(data.documents_url);
      }
    } catch (error) {
      console.error('Error fetching verification:', error);
      toast.error('Failed to load verification status');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!documentsUrl.trim()) {
      toast.error('Please provide a document URL');
      return;
    }

    setSubmitting(true);
    try {
      if (verification) {
        // Update existing
        const { error } = await supabase
          .from('creator_verifications')
          .update({ documents_url: documentsUrl })
          .eq('id', verification.id);

        if (error) throw error;
        toast.success('Verification updated successfully');
      } else {
        // Create new
        const { error } = await supabase
          .from('creator_verifications')
          .insert({
            creator_id: user?.id,
            documents_url: documentsUrl,
          });

        if (error) throw error;
        toast.success('Verification submitted successfully');
      }

      fetchVerification();
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast.error('Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const getStatusBadge = () => {
    if (!verification) return null;

    switch (verification.status) {
      case 'approved':
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-4 w-4 mr-1" />
            Verified
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-4 w-4 mr-1" />
            Rejected
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-4 w-4 mr-1" />
            Pending Review
          </Badge>
        );
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <ShieldCheck className="h-8 w-8" />
          Creator Verification
        </h1>
        <p className="text-muted-foreground">
          Get verified to build trust with your subscribers
        </p>
      </div>

      {verification && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Current Status
              {getStatusBadge()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Submitted: {new Date(verification.submitted_at).toLocaleDateString()}
              </p>
              {verification.verified_at && (
                <p className="text-sm text-muted-foreground">
                  Verified: {new Date(verification.verified_at).toLocaleDateString()}
                </p>
              )}
              {verification.rejection_reason && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <strong>Rejection Reason:</strong> {verification.rejection_reason}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {(!verification || verification.status === 'rejected' || verification.status === 'pending') && (
        <Card>
          <CardHeader>
            <CardTitle>
              {verification ? 'Update Verification' : 'Submit for Verification'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="documents">Identity Document URL</Label>
              <Input
                id="documents"
                type="url"
                placeholder="https://example.com/id-document.pdf"
                value={documentsUrl}
                onChange={(e) => setDocumentsUrl(e.target.value)}
                disabled={verification?.status === 'pending'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Provide a link to your government-issued ID or other verification documents
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !documentsUrl.trim() || verification?.status === 'pending'}
              className="w-full"
            >
              {submitting ? 'Submitting...' : verification ? 'Update Submission' : 'Submit for Verification'}
            </Button>

            {verification?.status === 'pending' && (
              <Alert>
                <AlertDescription>
                  Your verification is pending review. We'll notify you once it's been reviewed.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {verification?.status === 'approved' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Congratulations! Your account is verified. Your profile will now display a verification badge.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default CreatorVerification;
