import { useState, useEffect } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, CreditCard, Smartphone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface EmbeddedPaymentFormProps {
  amount: number;
  onSuccess: (balance: number) => void;
  onCancel: () => void;
}

export const EmbeddedPaymentForm = ({ amount, onSuccess, onCancel }: EmbeddedPaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'paypal'>('card');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded, confirm with backend
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error: confirmBackendError } = await supabase.functions.invoke('confirm-wallet-payment', {
          body: { paymentIntentId: paymentIntent.id },
        });

        if (confirmBackendError) throw confirmBackendError;

        if (data?.success) {
          setSuccess(true);
          setTimeout(() => {
            onSuccess(data.balance);
          }, 2000);
        } else {
          throw new Error('Failed to update wallet balance');
        }
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
        <p className="text-muted-foreground">
          ${amount.toFixed(2)} has been added to your wallet
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-primary/5 rounded-lg">
        <div className="text-sm text-muted-foreground">Amount to add</div>
        <div className="text-2xl font-bold">${amount.toFixed(2)}</div>
      </div>

      <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="card" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Card
          </TabsTrigger>
          <TabsTrigger value="apple_pay" className="gap-2">
            <Smartphone className="w-4 h-4" />
            Apple Pay
          </TabsTrigger>
          <TabsTrigger value="paypal" className="gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.76-4.852.073-.453.462-.787.922-.787h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.72-4.46z"/>
            </svg>
            PayPal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="card" className="space-y-4 mt-4">
          <PaymentElement 
            options={{
              layout: 'accordion',
              fields: {
                billingDetails: {
                  address: {
                    country: 'auto'
                  }
                }
              }
            }}
          />
        </TabsContent>

        <TabsContent value="apple_pay" className="space-y-4 mt-4">
          <div className="p-4 bg-muted rounded-lg text-center">
            <Smartphone className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Apple Pay is available on Safari, iOS, and macOS devices with Apple Pay enabled.
            </p>
            <PaymentElement 
              options={{
                layout: 'accordion',
                wallets: {
                  applePay: 'auto',
                  googlePay: 'never'
                }
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="paypal" className="space-y-4 mt-4">
          <div className="p-4 bg-muted rounded-lg text-center">
            <svg className="w-12 h-12 mx-auto mb-2 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.76-4.852.073-.453.462-.787.922-.787h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.72-4.46z"/>
            </svg>
            <p className="text-sm text-muted-foreground mb-4">
              PayPal will open in a new window to complete payment securely.
            </p>
            <PaymentElement 
              options={{
                layout: 'accordion',
                wallets: {
                  applePay: 'never',
                  googlePay: 'never'
                }
              }}
            />
          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay $${amount.toFixed(2)}`
          )}
        </Button>
      </div>
    </form>
  );
};
