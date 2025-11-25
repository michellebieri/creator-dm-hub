import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      const bundleId = searchParams.get('bundle_id');
      
      if (!sessionId) {
        toast({
          title: "Error",
          description: "No payment session found",
          variant: "destructive",
        });
        navigate('/messages');
        return;
      }

      try {
        // Check if this is a bundle purchase
        if (bundleId) {
          const { data, error } = await supabase.functions.invoke('verify-bundle-payment', {
            body: { sessionId, bundleId },
          });

          if (error) throw error;

          if (data?.success) {
            setVerified(true);
            toast({
              title: "Bundle Purchase Successful!",
              description: `${data.unlockedCount} items unlocked`,
            });
          } else {
            throw new Error("Bundle payment verification failed");
          }
        } else {
          // Wallet deposit verification
          const { data, error } = await supabase.functions.invoke('verify-wallet-payment', {
            body: { sessionId },
          });

          if (error) throw error;

          if (data?.success) {
            setVerified(true);
            toast({
              title: "Funds Added!",
              description: `Your wallet balance is now $${data.balance?.toFixed(2) || '0.00'}`,
            });
          } else {
            throw new Error("Payment verification failed");
          }
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        toast({
          title: "Verification Error",
          description: "There was an issue verifying your payment. Please contact support.",
          variant: "destructive",
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        {verifying ? (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
            <h1 className="text-2xl font-bold mb-2">Verifying Payment</h1>
            <p className="text-muted-foreground">
              Please wait while we confirm your purchase...
            </p>
          </>
        ) : verified ? (
          <>
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground mb-6">
              {searchParams.get('bundle_id') 
                ? 'Your content bundle has been unlocked. View it in your vault!'
                : 'Funds have been added to your wallet and can be used across all creators.'}
            </p>
            <div className="flex flex-col gap-3">
              {searchParams.get('bundle_id') ? (
                <>
                  <Button onClick={() => navigate('/vault')} className="w-full">
                    View in My Vault
                  </Button>
                  <Button onClick={() => navigate('/messages')} variant="outline" className="w-full">
                    Back to Messages
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate('/messages')} className="w-full">
                  Start Chatting
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
            <p className="text-muted-foreground mb-6">
              Please contact support if you've been charged.
            </p>
            <Button onClick={() => navigate('/messages')} variant="outline" className="w-full">
              Return to Messages
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default PaymentSuccess;
