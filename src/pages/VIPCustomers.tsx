import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Crown, Star, DollarSign, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface VIPCustomer {
  id: string;
  customer_id: string;
  custom_price_per_message: number | null;
  custom_unlockable_discount: number | null;
  notes: string | null;
  customer: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

export default function VIPCustomers() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vipCustomers, setVipCustomers] = useState<VIPCustomer[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customPrice, setCustomPrice] = useState('');
  const [customDiscount, setCustomDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch VIP customers
      const { data: vipData, error: vipError } = await supabase
        .from('vip_pricing')
        .select(`
          *,
          customer:profiles!vip_pricing_customer_id_fkey(display_name, username, avatar_url)
        `)
        .eq('creator_id', user.id);

      if (vipError) throw vipError;
      setVipCustomers(vipData || []);

      // Fetch all customers who have conversed with creator
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select(`
          customer_id,
          customer:profiles!conversations_customer_id_fkey(id, display_name, username, avatar_url)
        `)
        .eq('creator_id', user.id);

      if (convError) throw convError;

      const uniqueCustomers = Array.from(
        new Map(convData?.map(c => [c.customer_id, c.customer]) || []).values()
      );
      setAllCustomers(uniqueCustomers);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load VIP customer data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVIP = async () => {
    if (!selectedCustomer) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('vip_pricing')
        .upsert({
          creator_id: user!.id,
          customer_id: selectedCustomer.id,
          custom_price_per_message: customPrice ? parseFloat(customPrice) : null,
          custom_unlockable_discount: customDiscount ? parseFloat(customDiscount) : null,
          notes: notes || null,
        });

      if (error) throw error;

      toast.success('VIP customer settings saved!');
      setSelectedCustomer(null);
      setCustomPrice('');
      setCustomDiscount('');
      setNotes('');
      fetchData();
    } catch (error: any) {
      console.error('Error saving VIP:', error);
      toast.error(error.message || 'Failed to save VIP settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveVIP = async (vipId: string) => {
    try {
      const { error } = await supabase
        .from('vip_pricing')
        .delete()
        .eq('id', vipId);

      if (error) throw error;

      toast.success('VIP status removed');
      fetchData();
    } catch (error: any) {
      console.error('Error removing VIP:', error);
      toast.error(error.message || 'Failed to remove VIP status');
    }
  };

  if (loading || authLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">VIP Customers</h1>
            <p className="text-muted-foreground mt-2">
              Offer special pricing to your most valued customers
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Crown className="h-4 w-4 mr-2" />
                Add VIP Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add VIP Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Customer</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto mt-2">
                    {allCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => setSelectedCustomer(customer)}
                        className={`w-full p-3 text-left rounded-lg border transition-colors ${
                          selectedCustomer?.id === customer.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <p className="font-medium">{customer.display_name}</p>
                        <p className="text-sm text-muted-foreground">@{customer.username}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedCustomer && (
                  <>
                    <div>
                      <Label>Custom Message Price ($)</Label>
                      <Input
                        type="number"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder="Leave empty to use default"
                        min="0"
                        step="0.01"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Set a custom price per message for this VIP
                      </p>
                    </div>

                    <div>
                      <Label>Unlockable Discount (%)</Label>
                      <Input
                        type="number"
                        value={customDiscount}
                        onChange={(e) => setCustomDiscount(e.target.value)}
                        placeholder="Leave empty for no discount"
                        min="0"
                        max="100"
                        step="1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Percentage discount on all unlockable content
                      </p>
                    </div>

                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any notes about this VIP customer..."
                        rows={3}
                      />
                    </div>

                    <Button onClick={handleSaveVIP} disabled={saving} className="w-full">
                      {saving ? 'Saving...' : 'Save VIP Settings'}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vipCustomers.map((vip) => (
            <Card key={vip.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <Badge className="bg-yellow-500/10 text-yellow-500">
                  <Crown className="h-3 w-3 mr-1" />
                  VIP
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveVIP(vip.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-bold">{vip.customer.display_name}</h3>
                <p className="text-sm text-muted-foreground">@{vip.customer.username}</p>
              </div>

              <div className="space-y-3">
                {vip.custom_price_per_message && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Custom message price: <strong>${vip.custom_price_per_message.toFixed(2)}</strong>
                    </span>
                  </div>
                )}

                {vip.custom_unlockable_discount && (
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Discount: <strong>{vip.custom_unlockable_discount}%</strong> off unlockables
                    </span>
                  </div>
                )}

                {vip.notes && (
                  <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted/50 rounded">
                    {vip.notes}
                  </p>
                )}
              </div>
            </Card>
          ))}

          {vipCustomers.length === 0 && (
            <Card className="col-span-full p-12">
              <div className="text-center">
                <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No VIP Customers Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start offering special pricing to your most valued customers
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Add Your First VIP</Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
