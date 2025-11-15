import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Plus, TrendingUp, TrendingDown, Award } from 'lucide-react';

interface PricingExperiment {
  id: string;
  content_type: string;
  variant_a_price: number;
  variant_b_price: number;
  variant_a_views: number;
  variant_b_views: number;
  variant_a_conversions: number;
  variant_b_conversions: number;
  status: string;
  winner: string | null;
  created_at: string;
  ended_at: string | null;
}

export default function PricingExperiments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [experiments, setExperiments] = useState<PricingExperiment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [contentType, setContentType] = useState('');
  const [variantAPrice, setVariantAPrice] = useState('');
  const [variantBPrice, setVariantBPrice] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchExperiments();
  }, [user, navigate]);

  const fetchExperiments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pricing_experiments')
        .select('*')
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExperiments(data || []);
    } catch (error) {
      console.error('Error fetching experiments:', error);
      toast.error('Failed to load experiments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!contentType || !variantAPrice || !variantBPrice) {
      toast.error('Please fill all fields');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('pricing_experiments')
        .insert({
          creator_id: user?.id,
          content_type: contentType,
          variant_a_price: parseFloat(variantAPrice),
          variant_b_price: parseFloat(variantBPrice),
          status: 'active',
        });

      if (error) throw error;

      toast.success('Experiment created');
      setDialogOpen(false);
      setContentType('');
      setVariantAPrice('');
      setVariantBPrice('');
      fetchExperiments();
    } catch (error) {
      console.error('Error creating experiment:', error);
      toast.error('Failed to create experiment');
    } finally {
      setCreating(false);
    }
  };

  const handleEndExperiment = async (id: string) => {
    try {
      const experiment = experiments.find((e) => e.id === id);
      if (!experiment) return;

      const aConversionRate = experiment.variant_a_views > 0 
        ? experiment.variant_a_conversions / experiment.variant_a_views 
        : 0;
      const bConversionRate = experiment.variant_b_views > 0 
        ? experiment.variant_b_conversions / experiment.variant_b_views 
        : 0;

      const winner = aConversionRate > bConversionRate ? 'variant_a' : 'variant_b';

      const { error } = await supabase
        .from('pricing_experiments')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          winner,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Experiment ended');
      fetchExperiments();
    } catch (error) {
      console.error('Error ending experiment:', error);
      toast.error('Failed to end experiment');
    }
  };

  const calculateConversionRate = (conversions: number, views: number) => {
    if (views === 0) return '0';
    return ((conversions / views) * 100).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Pricing A/B Tests</h1>
          <p className="text-muted-foreground">
            Test different price points to optimize your revenue
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Experiment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Pricing Experiment</DialogTitle>
              <DialogDescription>
                Test two different price points to see which performs better
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content-type">Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger id="content-type">
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-a">Variant A Price ($)</Label>
                <Input
                  id="variant-a"
                  type="number"
                  step="0.01"
                  value={variantAPrice}
                  onChange={(e) => setVariantAPrice(e.target.value)}
                  placeholder="9.99"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-b">Variant B Price ($)</Label>
                <Input
                  id="variant-b"
                  type="number"
                  step="0.01"
                  value={variantBPrice}
                  onChange={(e) => setVariantBPrice(e.target.value)}
                  placeholder="14.99"
                />
              </div>

              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Experiment'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {experiments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No experiments yet. Create one to start testing!
            </CardContent>
          </Card>
        ) : (
          experiments.map((experiment) => {
            const aRate = calculateConversionRate(
              experiment.variant_a_conversions,
              experiment.variant_a_views
            );
            const bRate = calculateConversionRate(
              experiment.variant_b_conversions,
              experiment.variant_b_views
            );

            return (
              <Card key={experiment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="capitalize">
                      {experiment.content_type} Pricing Test
                    </CardTitle>
                    <Badge
                      variant={
                        experiment.status === 'active' ? 'default' : 'secondary'
                      }
                    >
                      {experiment.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    Started {new Date(experiment.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className={experiment.winner === 'variant_a' ? 'border-success' : ''}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                          Variant A: ${experiment.variant_a_price}
                          {experiment.winner === 'variant_a' && (
                            <Award className="h-5 w-5 text-success" />
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Views:</span>
                          <span className="font-medium">{experiment.variant_a_views}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Conversions:</span>
                          <span className="font-medium">
                            {experiment.variant_a_conversions}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold">
                          <span>Conversion Rate:</span>
                          <span className="flex items-center gap-1">
                            {aRate}%
                            {parseFloat(aRate) > parseFloat(bRate) ? (
                              <TrendingUp className="h-4 w-4 text-success" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-destructive" />
                            )}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className={experiment.winner === 'variant_b' ? 'border-success' : ''}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                          Variant B: ${experiment.variant_b_price}
                          {experiment.winner === 'variant_b' && (
                            <Award className="h-5 w-5 text-success" />
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Views:</span>
                          <span className="font-medium">{experiment.variant_b_views}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Conversions:</span>
                          <span className="font-medium">
                            {experiment.variant_b_conversions}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold">
                          <span>Conversion Rate:</span>
                          <span className="flex items-center gap-1">
                            {bRate}%
                            {parseFloat(bRate) > parseFloat(aRate) ? (
                              <TrendingUp className="h-4 w-4 text-success" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-destructive" />
                            )}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {experiment.status === 'active' && (
                    <Button
                      onClick={() => handleEndExperiment(experiment.id)}
                      variant="outline"
                      className="w-full"
                    >
                      End Experiment & Set Winner
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
