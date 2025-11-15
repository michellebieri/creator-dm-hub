import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Calendar, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export default function PromotionManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discount_percentage: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchCampaigns();
  }, [user]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('promotion_campaigns')
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load campaigns",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreate = async () => {
    try {
      const { error } = await supabase
        .from('promotion_campaigns')
        .insert([{
          creator_id: user!.id,
          title: formData.title,
          description: formData.description,
          discount_percentage: parseFloat(formData.discount_percentage),
          start_date: formData.start_date,
          end_date: formData.end_date,
        }]);

      if (error) throw error;

      toast({
        title: "Campaign created",
        description: "Your promotion campaign is now active",
      });

      setDialogOpen(false);
      setFormData({ title: '', description: '', discount_percentage: '', start_date: '', end_date: '' });
      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: "Failed to create campaign",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Promotion Campaigns</h1>
              <p className="text-muted-foreground">
                Create and manage promotional campaigns
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>

          <div className="grid gap-4">
            {campaigns.map((campaign) => {
              const isActive = new Date(campaign.start_date) <= new Date() && new Date() <= new Date(campaign.end_date);
              return (
                <Card key={campaign.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold">{campaign.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${
                          isActive ? 'bg-success/10 text-success' : 'bg-muted'
                        }`}>
                          {isActive ? 'Active' : 'Scheduled'}
                        </span>
                      </div>
                      {campaign.description && (
                        <p className="text-muted-foreground">{campaign.description}</p>
                      )}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="font-semibold">{campaign.discount_percentage}% off</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Promotion Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Campaign Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Black Friday Sale"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your campaign..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount Percentage</Label>
                  <Input
                    type="number"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                    placeholder="20"
                    min="0"
                    max="100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Create Campaign
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
