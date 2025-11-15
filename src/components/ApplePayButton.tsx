import { useEffect, useState } from 'react';
import { PaymentRequestButtonElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ApplePayButtonProps {
  amount: number;
  onSuccess: (balance: number) => void;
  onError: () => void;
}

export const ApplePayButton = ({ amount, onSuccess, onError }: ApplePayButtonProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);

  useEffect(() => {
    if (!stripe || !elements) return;

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: {
        label: 'Add Funds',
        amount: Math.round(amount * 100), // Convert to cents
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    // Check if Apple Pay / Payment Request is available
    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
        setCanMakePayment(true);
      }
    });

    pr.on('paymentmethod', async (event) => {
      try {
        // Get client secret from backend
        const { data, error } = await supabase.functions.invoke('add-funds', {
          body: { amount },
        });

        if (error) throw error;

        // Confirm the payment
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          data.clientSecret,
          {
            payment_method: event.paymentMethod.id,
          },
          { handleActions: false }
        );

        if (confirmError) {
          event.complete('fail');
          throw confirmError;
        }

        event.complete('success');

        // Confirm with backend
        if (paymentIntent && paymentIntent.status === 'succeeded') {
          const { data: confirmData, error: confirmBackendError } = await supabase.functions.invoke('confirm-wallet-payment', {
            body: { paymentIntentId: paymentIntent.id },
          });

          if (confirmBackendError) throw confirmBackendError;

          if (confirmData?.success) {
            toast({
              title: "Payment Successful!",
              description: `$${amount.toFixed(2)} has been added to your wallet`,
            });
            onSuccess(confirmData.balance);
          }
        }
      } catch (err: any) {
        console.error('Apple Pay error:', err);
        toast({
          title: "Payment Failed",
          description: err.message || "Failed to process payment",
          variant: "destructive",
        });
        onError();
      }
    });

    return () => {
      pr.off('paymentmethod');
    };
  }, [stripe, elements, amount, toast, onSuccess, onError]);

  if (!canMakePayment || !paymentRequest) {
    return null;
  }

  return (
    <div className="my-4">
      <PaymentRequestButtonElement options={{ paymentRequest }} />
    </div>
  );
};
