import { useState, useEffect } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

      <div className="text-sm text-muted-foreground mb-2">
        💳 Card • 🍎 Apple Pay • 💚 Google Pay
      </div>

      <PaymentElement />

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
