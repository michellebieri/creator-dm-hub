import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, CheckCircle, Clock, XCircle, Info } from 'lucide-react';

interface Verification {
  id: string;
  status: string;
  verification_method: string | null;
  document_type: string | null;
  created_at: string;
  verified_at: string | null;
}

export default function AgeVerification() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [verificationMethod, setVerificationMethod] = useState('');
  const [documentType, setDocumentType] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchVerification();
  }, [user, navigate]);

  const fetchVerification = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('age_verifications')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      setVerification(data);
    } catch (error) {
      console.error('Error fetching verification:', error);
      toast.error('Failed to load verification status');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!verificationMethod || !documentType) {
      toast.error('Please select both verification method and document type');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('age_verifications')
        .insert({
          user_id: user?.id,
          verification_method: verificationMethod,
          document_type: documentType,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Verification request submitted');
      fetchVerification();
    } catch (error: any) {
      console.error('Error submitting verification:', error);
      toast.error(error.message || 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-warning" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default">Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Age Verification</h1>
        <p className="text-muted-foreground">
          Verify your age to access all platform features
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Verification Status</CardTitle>
                <CardDescription>
                  Complete age verification to unlock full access
                </CardDescription>
              </div>
            </div>
            {verification && getStatusBadge(verification.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {verification ? (
            <>
              <Alert>
                {getStatusIcon(verification.status)}
                <AlertDescription>
                  {verification.status === 'verified' && (
                    <>
                      Your age has been verified on{' '}
                      {new Date(verification.verified_at!).toLocaleDateString()}
                    </>
                  )}
                  {verification.status === 'pending' && (
                    'Your verification is being reviewed. This typically takes 1-2 business days.'
                  )}
                  {verification.status === 'rejected' && (
                    'Your verification was rejected. Please submit a new request with valid documentation.'
                  )}
                </AlertDescription>
              </Alert>

              {verification.verification_method && (
                <div className="space-y-2">
                  <Label>Verification Method</Label>
                  <p className="text-sm capitalize">{verification.verification_method}</p>
                </div>
              )}

              {verification.document_type && (
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <p className="text-sm capitalize">{verification.document_type}</p>
                </div>
              )}

              {verification.status === 'rejected' && (
                <Button
                  onClick={() => setVerification(null)}
                  variant="outline"
                  className="w-full"
                >
                  Submit New Verification
                </Button>
              )}
            </>
          ) : (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Age verification is required to access certain features. Please provide valid
                  identification to verify you are 18 years or older.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="method">Verification Method</Label>
                  <Select value={verificationMethod} onValueChange={setVerificationMethod}>
                    <SelectTrigger id="method">
                      <SelectValue placeholder="Select verification method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">Document Upload</SelectItem>
                      <SelectItem value="id_verification">ID Verification Service</SelectItem>
                      <SelectItem value="credit_card">Credit Card Verification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document">Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger id="document">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="national_id">National ID Card</SelectItem>
                      <SelectItem value="state_id">State ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">Important Information</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Your document must be valid and not expired</li>
                    <li>• All information must be clearly visible</li>
                    <li>• Documents are securely encrypted and stored</li>
                    <li>• Verification typically takes 1-2 business days</li>
                  </ul>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !verificationMethod || !documentType}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Verification Request'
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
