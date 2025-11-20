import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BundleSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bundle, setBundle] = useState({
    id: '',
    is_active: false,
    original_price: 99,
    discounted_price: 7,
    messages_included: 12,
  });

  useEffect(() => {
    if (user) {
      fetchBundle();
    }
  }, [user]);

  const fetchBundle = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('content_bundles')
        .select('*')
        .eq('creator_id', user?.id)
        .limit(1)
        .single();

      if (data) {
        setBundle({
          id: data.id,
          is_active: data.is_active || false,
          original_price: (data as any).original_price || 99,
          discounted_price: data.price || 7,
          messages_included: (data as any).messages_included || 12,
        });
      }
    } catch (error) {
      console.error('Error fetching bundle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (bundle.id) {
        const { error } = await supabase
          .from('content_bundles')
          .update({
            is_active: bundle.is_active,
            original_price: bundle.original_price,
            price: bundle.discounted_price,
            messages_included: bundle.messages_included,
          })
          .eq('id', bundle.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('content_bundles')
          .insert({
            creator_id: user?.id,
            title: 'Content Bundle',
            is_active: bundle.is_active,
            original_price: bundle.original_price,
            price: bundle.discounted_price,
            messages_included: bundle.messages_included,
          });

        if (error) throw error;
      }
      toast.success('Bundle settings saved successfully');
    } catch (error) {
      console.error('Error saving bundle:', error);
      toast.error('Failed to save bundle settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Bundle</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Bundle Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="active-bundle">Active bundle</Label>
              <Switch
                id="active-bundle"
                checked={bundle.is_active}
                onCheckedChange={(checked) => setBundle({ ...bundle, is_active: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="original-price">Original price</Label>
              <Input
                id="original-price"
                type="number"
                step="0.01"
                value={bundle.original_price}
                onChange={(e) => setBundle({ ...bundle, original_price: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discounted-price">Discounted price</Label>
              <Input
                id="discounted-price"
                type="number"
                step="0.01"
                value={bundle.discounted_price}
                onChange={(e) => setBundle({ ...bundle, discounted_price: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="messages-included">Messages included</Label>
              <Input
                id="messages-included"
                type="number"
                value={bundle.messages_included}
                onChange={(e) => setBundle({ ...bundle, messages_included: parseInt(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Media Files</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/vault')} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add from vault
            </Button>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default BundleSettings;
