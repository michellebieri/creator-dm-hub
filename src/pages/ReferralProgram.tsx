import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Copy, Share2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Referral {
  id: string;
  referred_id: string;
  status: string;
  reward_amount: number;
  created_at: string;
  profiles: {
    display_name: string;
  };
}

export default function ReferralProgram() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, converted: 0, earned: 0 });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    generateReferralCode();
    fetchReferrals();
  }, [user]);

  const generateReferralCode = () => {
    if (!user) return;
    const code = `${user.id.substring(0, 8).toUpperCase()}`;
    setReferralCode(code);
  };

  const fetchReferrals = async () => {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          profiles!referrals_referred_id_fkey (display_name)
        `)
        .eq('referrer_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReferrals((data || []) as any);
      
      const total = data?.length || 0;
      const pending = data?.filter(r => r.status === 'pending').length || 0;
      const converted = data?.filter(r => r.status === 'converted').length || 0;
      const earned = data?.reduce((sum, r) => sum + (r.reward_paid ? r.reward_amount : 0), 0) || 0;

      setStats({ total, pending, converted, earned });
    } catch (error: any) {
      toast({
        title: "Failed to load referrals",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied",
      description: "Referral link copied to clipboard",
    });
  };

  const shareReferral = async () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    const text = `Join me on DM.me! Use my referral code: ${referralCode}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join DM.me', text, url: link });
      } catch (error) {
        copyReferralLink();
      }
    } else {
      copyReferralLink();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Referral Program</h1>
            <p className="text-muted-foreground">
              Earn rewards by inviting friends to join DM.me
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Converted</p>
                <p className="text-2xl font-bold">{stats.converted}</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold">${stats.earned.toFixed(2)}</p>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Your Referral Code</h2>
              <div className="flex gap-2">
                <Input value={referralCode} readOnly className="font-mono text-lg" />
                <Button variant="outline" onClick={copyReferralLink}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button onClick={shareReferral}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Share this code with friends. When they sign up and make their first purchase, 
                you'll both receive rewards!
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h2 className="text-xl font-bold">Your Referrals</h2>
              </div>
              {referrals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No referrals yet. Start sharing your code!
                </p>
              ) : (
                <div className="space-y-2">
                  {referrals.map((referral) => (
                    <div key={referral.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{referral.profiles.display_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-1 rounded text-sm ${
                          referral.status === 'converted' ? 'bg-success/10 text-success' : 'bg-muted'
                        }`}>
                          {referral.status}
                        </span>
                        {referral.reward_amount > 0 && (
                          <p className="text-sm font-medium mt-1">
                            ${referral.reward_amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
