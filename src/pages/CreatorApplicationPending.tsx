import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const CreatorApplicationPending = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/creator-auth');
      return;
    }
    if (user) fetchStatus();
  }, [user, loading]);

  const fetchStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('creator_verifications')
      .select('status, rejection_reason')
      .eq('creator_id', user.id)
      .single();

    setStatus((data?.status as any) || 'pending');
    setRejectionReason(data?.rejection_reason || null);
    setFetching(false);

    // If approved, redirect to onboarding
    if (data?.status === 'approved') {
      navigate('/creator-onboarding');
    }
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-2">
          {status === 'pending' && (
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Application Under Review</h2>
            </div>
          )}
          {status === 'rejected' && (
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold">Application Not Approved</h2>
            </div>
          )}
          {status === 'approved' && (
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">You're Approved!</h2>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'pending' && (
            <>
              <p className="text-muted-foreground">
                Your application has been submitted and is currently being reviewed. We aim to respond within <strong>1–3 business days</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                You'll receive an email as soon as a decision has been made.
              </p>
              <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut().then(() => navigate('/'))}>
                Sign Out
              </Button>
            </>
          )}

          {status === 'rejected' && (
            <>
              <p className="text-muted-foreground">
                Unfortunately your creator application was not approved at this time.
              </p>
              {rejectionReason && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-left">
                  <p className="font-medium mb-1">Reason:</p>
                  <p className="text-muted-foreground">{rejectionReason}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                If you believe this is a mistake, please contact support.
              </p>
              <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut().then(() => navigate('/'))}>
                Return to Home
              </Button>
            </>
          )}

          {status === 'approved' && (
            <>
              <p className="text-muted-foreground">Your application has been approved! Let's set up your creator profile.</p>
              <Button className="w-full" onClick={() => navigate('/creator-onboarding')}>
                Set Up My Profile →
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorApplicationPending;
