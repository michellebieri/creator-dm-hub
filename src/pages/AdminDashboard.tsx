import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChevronLeft, Search, Users, Crown, DollarSign, TrendingUp,
  RefreshCw, Loader2, ShieldCheck, User, Calendar, MoreVertical, Eye
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';

interface UserRow {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
}

interface StatsType {
  totalUsers: number;
  totalCreators: number;
  totalTransactions: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useRoleCheck();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<StatsType>({ totalUsers: 0, totalCreators: 0, totalTransactions: 0, totalRevenue: 0 });

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) { navigate('/auth'); return; }
      if (!isAdmin) { navigate('/dashboard'); return; }
      fetchAll();
    }
  }, [authLoading, roleLoading, user, isAdmin]);

  const fetchAll = async () => {
    setFetching(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: allRoles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap: Record<string, string[]> = {};
      (allRoles || []).forEach(r => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      const enriched: UserRow[] = (profiles || []).map(p => ({
        ...p,
        roles: roleMap[p.id] || [],
      }));

      setUsers(enriched);

      // Stats
      const creatorCount = enriched.filter(u => u.roles.includes('creator')).length;

      const { count: txCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      const { data: revData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'completed');

      const totalRev = (revData || []).reduce((s, t) => s + (t.amount || 0), 0);

      setStats({
        totalUsers: enriched.length,
        totalCreators: creatorCount,
        totalTransactions: txCount || 0,
        totalRevenue: totalRev,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.display_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  });

  const allUsers = filtered;
  const creators = filtered.filter(u => u.roles.includes('creator'));
  const admins = filtered.filter(u => u.roles.includes('admin'));

  const UserCard = ({ u }: { u: UserRow }) => (
    <div className="flex items-center justify-between p-3 hover:bg-muted/40 rounded-lg transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={u.avatar_url || undefined} />
          <AvatarFallback className="text-sm">
            {u.display_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate">{u.display_name}</p>
            {u.roles.includes('admin') && (
              <Badge variant="destructive" className="text-xs py-0">Admin</Badge>
            )}
            {u.roles.includes('creator') && (
              <Badge className="text-xs py-0">Creator</Badge>
            )}
            {!u.roles.includes('creator') && !u.roles.includes('admin') && (
              <Badge variant="secondary" className="text-xs py-0">Fan</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">@{u.username}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <p className="text-xs text-muted-foreground hidden sm:block">
          {new Date(u.created_at).toLocaleDateString()}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/creator/${u.username}`)}>
              <Eye className="h-4 w-4 mr-2" />
              View Profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Admin Panel
          </h1>
          <Button variant="ghost" size="icon" onClick={fetchAll} disabled={fetching}>
            <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-primary' },
            { label: 'Creators', value: stats.totalCreators, icon: Crown, color: 'text-primary' },
            { label: 'Transactions', value: stats.totalTransactions, icon: TrendingUp, color: 'text-primary' },
            { label: 'Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-primary' },
          ].map(s => (
            <Card key={s.label} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-2xl font-bold">{fetching ? '—' : s.value}</p>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or username…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              All ({allUsers.length})
            </TabsTrigger>
            <TabsTrigger value="creators" className="flex-1">
              Creators ({creators.length})
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex-1">
              Admins ({admins.length})
            </TabsTrigger>
          </TabsList>

          {fetching ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="all">
                <Card>
                  <CardContent className="p-2 divide-y divide-border">
                    {allUsers.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground text-sm">No users found</p>
                    ) : (
                      allUsers.map(u => <UserCard key={u.id} u={u} />)
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="creators">
                <Card>
                  <CardContent className="p-2 divide-y divide-border">
                    {creators.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground text-sm">No creators yet</p>
                    ) : (
                      creators.map(u => <UserCard key={u.id} u={u} />)
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="admins">
                <Card>
                  <CardContent className="p-2 divide-y divide-border">
                    {admins.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground text-sm">No admins found</p>
                    ) : (
                      admins.map(u => <UserCard key={u.id} u={u} />)
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}
