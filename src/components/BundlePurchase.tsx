import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface Bundle {
  id: string;
  title: string;
  description: string | null;
  price: number;
  discount_percentage: number | null;
  thumbnail_url: string | null;
  creator_id: string;
}

interface BundlePurchaseProps {
  creatorId?: string;
}

export const BundlePurchase = ({ creatorId }: BundlePurchaseProps) => {
  const { user } = useAuth();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchBundles();
  }, [creatorId]);

  const fetchBundles = async () => {
    try {
      let query = supabase
        .from('content_bundles')
        .select('*')
        .eq('is_active', true);

      if (creatorId) {
        query = query.eq('creator_id', creatorId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setBundles(data || []);
    } catch (error) {
      console.error('Error fetching bundles:', error);
      toast.error('Failed to load bundles');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (bundleId: string) => {
    if (!user) {
      toast.error('Please log in to purchase bundles');
      return;
    }

    setPurchasing(bundleId);
    try {
      const { data, error } = await supabase.functions.invoke('create-bundle-payment', {
        body: { bundleId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Failed to start purchase');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (bundles.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No bundles available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bundles.map((bundle) => (
        <Card key={bundle.id} className="flex flex-col">
          <CardHeader>
            {bundle.thumbnail_url && (
              <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-muted">
                <img
                  src={bundle.thumbnail_url}
                  alt={bundle.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-xl">{bundle.title}</CardTitle>
              {bundle.discount_percentage && bundle.discount_percentage > 0 && (
                <Badge variant="secondary" className="shrink-0">
                  {bundle.discount_percentage}% OFF
                </Badge>
              )}
            </div>
            {bundle.description && (
              <CardDescription className="line-clamp-2">{bundle.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">${bundle.price.toFixed(2)}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => handlePurchase(bundle.id)}
              disabled={purchasing === bundle.id}
              className="w-full"
            >
              {purchasing === bundle.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Purchase Bundle
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
