import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, Trash2, Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentMethod {
  id: string;
  last4: string;
  brand: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

const AddPaymentMethodForm = ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const { toast } = useToast();

  // Detect if dark mode is active
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  const elementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: isDarkMode ? '#f8fafc' : '#1a1a1a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSmoothing: 'antialiased',
        '::placeholder': {
          color: isDarkMode ? '#94a3b8' : '#6b7280',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;

    setLoading(true);

    try {
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) throw new Error('Card number element not found');

      // Get or create Stripe customer
      const { data: customerData, error: customerError } = await supabase.functions.invoke(
        'get-or-create-stripe-customer'
      );

      if (customerError) throw customerError;

      // Create payment method
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement,
        billing_details: {
          name: cardholderName || undefined,
          address: {
            postal_code: billingZip || undefined,
          },
        },
      });

      if (pmError) throw pmError;

      // Save to database
      const { error: saveError } = await supabase.functions.invoke('add-payment-method', {
        body: { 
          paymentMethodId: paymentMethod.id,
          isDefault 
        },
      });

      if (saveError) throw saveError;

      toast({
        title: 'Success',
        description: 'Payment method added successfully',
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add payment method',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cardholderName">Cardholder Name (Optional)</Label>
          <Input
            id="cardholderName"
            type="text"
            placeholder="John Doe"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Card Number</Label>
          <div 
            className="p-3 border border-input rounded-lg bg-white dark:bg-slate-900 min-h-[44px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 relative"
            style={{ isolation: 'isolate', pointerEvents: 'auto' }}
          >
            <CardNumberElement options={elementOptions} className="w-full" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Expiration Date</Label>
            <div 
              className="p-3 border border-input rounded-lg bg-white dark:bg-slate-900 min-h-[44px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 relative"
              style={{ isolation: 'isolate', pointerEvents: 'auto' }}
            >
              <CardExpiryElement options={elementOptions} className="w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>CVC</Label>
            <div 
              className="p-3 border border-input rounded-lg bg-white dark:bg-slate-900 min-h-[44px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 relative"
              style={{ isolation: 'isolate', pointerEvents: 'auto' }}
            >
              <CardCvcElement options={elementOptions} className="w-full" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="billingZip">Billing ZIP Code (Optional)</Label>
          <Input
            id="billingZip"
            type="text"
            placeholder="12345"
            value={billingZip}
            onChange={(e) => setBillingZip(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="setDefault"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-4 h-4 rounded border-border"
        />
        <label htmlFor="setDefault" className="text-sm">
          Set as default payment method
        </label>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || loading} className="flex-1">
          {loading ? 'Adding...' : 'Add Card'}
        </Button>
      </div>
    </form>
  );
};

const PaymentMethods = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const loadPaymentMethods = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('list-payment-methods');
      
      if (error) throw error;
      
      setPaymentMethods(data.paymentMethods || []);
    } catch (error: any) {
      console.error('Error loading payment methods:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment methods',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;

    try {
      const { error } = await supabase.functions.invoke('delete-payment-method', {
        body: { paymentMethodId: id },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payment method removed',
      });

      loadPaymentMethods();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove payment method',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke('set-default-payment-method', {
        body: { paymentMethodId: id },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Default payment method updated',
      });

      loadPaymentMethods();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update default payment method',
        variant: 'destructive',
      });
    }
  };

  const getCardIcon = (brand: string) => {
    return <CreditCard className="h-6 w-6" />;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Payment Methods</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4 space-y-4">
        <Button onClick={() => setShowAddDialog(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : paymentMethods.length === 0 ? (
          <Card className="p-8 text-center">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Payment Methods</h3>
            <p className="text-muted-foreground mb-4">
              Add a payment method to make purchases faster
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((pm) => (
              <Card key={pm.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getCardIcon(pm.brand)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{pm.brand}</span>
                        <span className="text-muted-foreground">•••• {pm.last4}</span>
                        {pm.is_default && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Expires {pm.exp_month}/{pm.exp_year}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!pm.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(pm.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(pm.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent 
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
          </DialogHeader>
          <Elements stripe={stripePromise}>
            <AddPaymentMethodForm
              onSuccess={() => {
                setShowAddDialog(false);
                loadPaymentMethods();
              }}
              onCancel={() => setShowAddDialog(false)}
            />
          </Elements>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentMethods;