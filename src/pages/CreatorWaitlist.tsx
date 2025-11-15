import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CreatorWaitlist = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [waitlistStatus, setWaitlistStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchWaitlistStatus();
    }
  }, [user, loading, navigate]);

  const fetchWaitlistStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('creator_settings')
        .select('waitlist_status')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // User doesn't have creator settings, they're not a creator
        setWaitlistStatus(null);
      } else {
        setWaitlistStatus(data.waitlist_status as any);
      }
    } catch (error) {
      console.error('Error fetching waitlist status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  if (loading || loadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!waitlistStatus) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Creator Application</CardTitle>
            <CardDescription>
              You haven't applied to be a creator yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                To apply as a creator, please complete the creator onboarding process.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (waitlistStatus) {
      case 'pending':
        return <Clock className="h-12 w-12 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-12 w-12 text-red-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (waitlistStatus) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending Review</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
    }
  };

  const getStatusMessage = () => {
    switch (waitlistStatus) {
      case 'pending':
        return 'Your creator application is currently under review. We typically review applications within 2-3 business days.';
      case 'approved':
        return 'Congratulations! Your creator application has been approved. You can now start creating content and messaging with your audience.';
      case 'rejected':
        return 'Unfortunately, your creator application was not approved at this time. Please contact support if you have questions.';
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Creator Waitlist Status</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {getStatusIcon()}
            <div>
              <h2 className="text-2xl font-bold mb-2">Application Status</h2>
              {getStatusBadge()}
            </div>
            <p className="text-muted-foreground max-w-md">
              {getStatusMessage()}
            </p>
          </div>
        </CardContent>
      </Card>

      {waitlistStatus === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle>What happens next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Review Process</p>
                <p className="text-sm text-muted-foreground">
                  Our team reviews your application and profile
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Notification</p>
                <p className="text-sm text-muted-foreground">
                  You'll receive an email once your application is processed
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Get Started</p>
                <p className="text-sm text-muted-foreground">
                  If approved, you can immediately start using creator features
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreatorWaitlist;
