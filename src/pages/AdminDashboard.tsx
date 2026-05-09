import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Loader2, Users, DollarSign, MessageCircle, Shield } from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';

interface WaitlistCreator {
  id: string;
  display_name: string;
  username: string;
  email: string;
  waitlist_status: string;
  created_at: string;
}

const AdminDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [waitlistCreators, setWaitlistCreators] = useState<WaitlistCreator[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCreators: 0,
    totalTransactions: 0,
    totalRevenue: 0,
  });
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      checkAdminStatus();
    }
  }, [user, loading, navigate]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      // Check user roles from user_roles table using RPC
      const { data: hasAdminRole, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (error) {
        console.error('Error checking admin role:', error);
        toast({
          title: "Access denied",
          description: "You don't have permission to access this page",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      if (!hasAdminRole) {
        toast({
          title: "Access denied",
          description: "You don't have permission to access this page",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      await fetchData();
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/dashboard');
    } finally {
      setChecking(false);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch waitlist creators
      const { data: creators } = await supabase
        .from('creator_settings')
        .select(`
          user_id,
          waitlist_status,
          created_at,
          profiles!inner(id, display_name, username)
        `)
        .eq('waitlist_status', 'pending')
        .order('created_at', { ascending: true });

      if (creators) {
        const formattedCreators = creators.map((c: any) => ({
          id: c.user_id,
          display_name: c.profiles.display_name,
          username: c.profiles.username,
          email: '',
          waitlist_status: c.waitlist_status,
          created_at: c.created_at,
        }));
        setWaitlistCreators(formattedCreators);
      }

      // Fetch stats
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: creatorsCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'creator');

      const { count: transactionsCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      const { data: revenue } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'completed');

      const totalRevenue = revenue?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalCreators: creatorsCount || 0,
        totalTransactions: transactionsCount || 0,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleWaitlistAction = async (userId: string, action: 'approved' | 'rejected') => {
    setProcessing(userId);
    try {
      const { error } = await supabase
        .from('creator_settings')
        .update({ waitlist_status: action })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: `Creator ${action}`,
        description: `The creator has been ${action} successfully`,
      });

      await fetchData();
    } catch (error) {
      console.error('Error updating waitlist:', error);
      toast({
        title: "Error",
        description: "Failed to update creator status",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <Button onClick={() => navigate('/users')}>
          Manage Users
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
        />
        <StatsCard
          title="Total Creators"
          value={stats.totalCreators}
          icon={Users}
        />
        <StatsCard
          title="Total Transactions"
          value={stats.totalTransactions}
          icon={MessageCircle}
        />
        <StatsCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Creator Waitlist</CardTitle>
          <CardDescription>
            Review and approve creators waiting to join the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {waitlistCreators.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No creators in waitlist
            </p>
          ) : (
            <div className="space-y-4">
              {waitlistCreators.map((creator) => (
                <div
                  key={creator.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{creator.display_name}</p>
                      <Badge variant="outline">@{creator.username}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Joined {new Date(creator.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleWaitlistAction(creator.id, 'approved')}
                      disabled={processing === creator.id}
                    >
                      {processing === creator.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleWaitlistAction(creator.id, 'rejected')}
                      disabled={processing === creator.id}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
