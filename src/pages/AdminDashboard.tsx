import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChevronLeft, Search, Users, Crown, DollarSign, TrendingUp,
  RefreshCw, Loader2, ShieldCheck, MoreVertical, Eye,
  CheckCircle, XCircle, Instagram, Clock
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
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

interface Application {
  id: string;
  creator_id: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  twitter_handle: string | null;
  follower_count: string | null;
  content_niche: string | null;
  about_yourself: string | null;
  rejection_reason: string | null;
  profile: { display_name: string; username: string; avatar_url: string | null } | null;
}

interface StatsType {
  totalUsers: number;
  totalCreators: number;
  totalTransactions: number;
  grossVolume: number;       // SUM(transactions.amount) — total money flowing through
  platformEarnings: number;  // SUM(transactions.platform_fee) — what platform keeps (25%)
  activeSubscribers: number;
}

interface SourceRow {
  type: string;
  count: number;
  gross: number;
  platformFee: number;
}

interface TopCreatorRow {
  creator_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  net_earnings: number;
  tx_count: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useRoleCheck();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<StatsType>({
    totalUsers: 0,
    totalCreators: 0,
    totalTransactions: 0,
    grossVolume: 0,
    platformEarnings: 0,
    activeSubscribers: 0,
  });
  const [sourceBreakdown, setSourceBreakdown] = useState<SourceRow[]>([]);
  const [topCreators, setTopCreators] = useState<TopCreatorRow[]>([]);

  // Application review dialog
  const [reviewApp, setReviewApp] = useState<Application | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

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
      const [profilesRes, rolesRes, appsRes, txCountRes, txRes, subCountRes] = await Promise.all([
        supabase.from('profiles').select('id, display_name, username, avatar_url, created_at').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('creator_verifications').select('*, profile:creator_id(display_name, username, avatar_url)').order('submitted_at', { ascending: false }),
        supabase.from('transactions').select('*', { count: 'exact', head: true }),
        supabase.from('transactions')
          .select('amount, platform_fee, net_amount, transaction_type, creator_id')
          .eq('status', 'completed'),
        supabase.from('creator_subscriptions')
          .select('id', { count: 'exact', head: true })
          .in('status', ['active', 'canceling']),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const roleMap: Record<string, string[]> = {};
      (rolesRes.data || []).forEach(r => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      const enriched: UserRow[] = (profilesRes.data || []).map(p => ({ ...p, roles: roleMap[p.id] || [] }));
      const profileById = new Map(enriched.map(p => [p.id, p]));
      setUsers(enriched);
      setApplications((appsRes.data || []) as Application[]);

      const txList = (txRes.data || []) as Array<{
        amount: number; platform_fee: number | null; net_amount: number | null;
        transaction_type: string | null; creator_id: string | null;
      }>;

      const grossVolume = txList.reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const platformEarnings = txList.reduce((s, t) => s + (Number(t.platform_fee) || 0), 0);

      // Revenue by source (transaction_type)
      const bySource = new Map<string, SourceRow>();
      for (const t of txList) {
        const key = t.transaction_type || 'other';
        const row = bySource.get(key) || { type: key, count: 0, gross: 0, platformFee: 0 };
        row.count += 1;
        row.gross += Number(t.amount) || 0;
        row.platformFee += Number(t.platform_fee) || 0;
        bySource.set(key, row);
      }
      setSourceBreakdown(Array.from(bySource.values()).sort((a, b) => b.gross - a.gross));

      // Top creators by net earnings
      const byCreator = new Map<string, { net: number; count: number }>();
      for (const t of txList) {
        if (!t.creator_id) continue;
        const row = byCreator.get(t.creator_id) || { net: 0, count: 0 };
        row.net += Number(t.net_amount) || 0;
        row.count += 1;
        byCreator.set(t.creator_id, row);
      }
      const topRows: TopCreatorRow[] = Array.from(byCreator.entries())
        .map(([cid, r]) => {
          const p = profileById.get(cid);
          return {
            creator_id: cid,
            display_name: p?.display_name || 'Unknown',
            username: p?.username || 'unknown',
            avatar_url: p?.avatar_url || null,
            net_earnings: r.net,
            tx_count: r.count,
          };
        })
        .sort((a, b) => b.net_earnings - a.net_earnings)
        .slice(0, 10);
      setTopCreators(topRows);

      setStats({
        totalUsers: enriched.length,
        totalCreators: enriched.filter(u => u.roles.includes('creator')).length,
        totalTransactions: txCountRes.count || 0,
        grossVolume,
        platformEarnings,
        activeSubscribers: subCountRes.count || 0,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  };

  const sourceLabel = (t: string) => {
    switch (t) {
      case 'subscription': return 'Subscriptions';
      case 'message': return 'Message payments';
      case 'unlock': return 'Content unlocks';
      case 'tip': return 'Tips';
      case 'bundle': return 'Bundle purchases';
      case 'deposit': return 'Wallet deposits';
      default: return t.charAt(0).toUpperCase() + t.slice(1);
    }
  };

  const handleApprove = async (app: Application) => {
    setProcessing(true);
    try {
      // Single SECURITY DEFINER RPC: verifies admin, grants creator role,
      // updates profiles.role (bypasses column-REVOKE), marks verification
      // approved — all atomic. Returns { success, error } so failures surface.
      const { data, error } = await supabase.rpc('admin_approve_creator_application', {
        p_application_id: app.id,
      });
      if (error) throw new Error(error.message);
      const res = data as { success: boolean; error?: string } | null;
      if (!res?.success) throw new Error(res?.error || 'Approval failed');

      // Best-effort notification (failures non-blocking — see B2 in PROJECT_STATE).
      try {
        await supabase.functions.invoke('create-notification', {
          body: { userId: app.creator_id, type: 'creator_approved', title: "You're Approved!", message: 'Your creator application has been approved. Set up your profile to start earning.', link: '/creator-onboarding' },
        });
      } catch { /* noop */ }

      toast({ title: 'Approved', description: `${app.profile?.display_name || 'Creator'} is now live.` });
      setReviewApp(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (app: Application) => {
    if (!rejectionReason.trim()) {
      toast({ title: 'Reason required', description: 'Please provide a rejection reason for the applicant.', variant: 'destructive' });
      return;
    }
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('admin_reject_creator_application', {
        p_application_id: app.id,
        p_reason: rejectionReason,
      });
      if (error) throw new Error(error.message);
      const res = data as { success: boolean; error?: string } | null;
      if (!res?.success) throw new Error(res?.error || 'Rejection failed');

      try {
        await supabase.functions.invoke('create-notification', {
          body: { userId: app.creator_id, type: 'creator_rejected', title: 'Application Update', message: 'Your creator application was not approved. Please check the creator portal for details.', link: '/creator-auth' },
        });
      } catch { /* noop */ }

      toast({ title: 'Rejected', description: 'Applicant has been notified.' });
      setReviewApp(null);
      setRejectionReason('');
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
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

        {/* Primary KPIs — platform-level only, not mixed with creator earnings */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-4 border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Platform earnings</p>
            </div>
            <p className="text-2xl font-bold">{fetching ? '—' : `$${stats.platformEarnings.toFixed(2)}`}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">25% fees collected</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Gross volume</p>
            </div>
            <p className="text-2xl font-bold">{fetching ? '—' : `$${stats.grossVolume.toFixed(2)}`}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">All money flowing through</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Active subscribers</p>
            </div>
            <p className="text-2xl font-bold">{fetching ? '—' : stats.activeSubscribers}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">recurring revenue base</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Users / Creators</p>
            </div>
            <p className="text-2xl font-bold">{fetching ? '—' : `${stats.totalUsers} / ${stats.totalCreators}`}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stats.totalTransactions} transactions total</p>
          </Card>
        </div>

        {/* Revenue by source */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Revenue by source</h2>
          {fetching ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : sourceBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {sourceBreakdown.map(row => {
                const pct = stats.grossVolume > 0 ? (row.gross / stats.grossVolume) * 100 : 0;
                return (
                  <div key={row.type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{sourceLabel(row.type)}</span>
                      <span className="text-muted-foreground">
                        ${row.gross.toFixed(2)} <span className="text-xs">• fee ${row.platformFee.toFixed(2)} • {row.count} tx</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top earning creators */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Top earning creators</h2>
          {fetching ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : topCreators.length === 0 ? (
            <p className="text-sm text-muted-foreground">No creator revenue yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {topCreators.map((c, idx) => (
                <div key={c.creator_id} className="flex items-center gap-3 py-2.5">
                  <span className="text-xs font-mono text-muted-foreground w-5 text-right">{idx + 1}</span>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={c.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{c.display_name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{c.username} • {c.tx_count} tx</p>
                  </div>
                  <p className="text-sm font-semibold">${c.net_earnings.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

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
        <Tabs defaultValue="applications">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="applications" className="relative">
              Applications
              {applications.filter(a => a.status === 'pending').length > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                  {applications.filter(a => a.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All ({allUsers.length})</TabsTrigger>
            <TabsTrigger value="creators">Creators ({creators.length})</TabsTrigger>
            <TabsTrigger value="admins">Admins ({admins.length})</TabsTrigger>
          </TabsList>

          {fetching ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* ── APPLICATIONS TAB ── */}
              <TabsContent value="applications" className="space-y-3 mt-4">
                {applications.length === 0 ? (
                  <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No applications yet</CardContent></Card>
                ) : (
                  applications.map(app => (
                    <Card key={app.id} className={`border-l-4 ${app.status === 'pending' ? 'border-l-primary' : app.status === 'approved' ? 'border-l-green-500' : 'border-l-destructive'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={app.profile?.avatar_url || undefined} />
                              <AvatarFallback>{(app.profile?.display_name || '?')[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{app.profile?.display_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">@{app.profile?.username}</p>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                {app.content_niche && <Badge variant="secondary" className="text-xs">{app.content_niche}</Badge>}
                                {app.follower_count && <Badge variant="outline" className="text-xs">{app.follower_count} followers</Badge>}
                                <Badge variant={app.status === 'pending' ? 'default' : app.status === 'approved' ? 'secondary' : 'destructive'} className="text-xs capitalize">{app.status}</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                            {new Date(app.submitted_at).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="mt-3 space-y-1 text-sm">
                          {app.instagram_handle && <p>📷 Instagram: <span className="text-primary">{app.instagram_handle}</span></p>}
                          {app.tiktok_handle && <p>🎵 TikTok: <span className="text-primary">{app.tiktok_handle}</span></p>}
                          {app.twitter_handle && <p>𝕏 Twitter: <span className="text-primary">{app.twitter_handle}</span></p>}
                          {app.about_yourself && (
                            <div className="mt-2 p-3 bg-muted/50 rounded-lg text-muted-foreground italic text-xs">
                              "{app.about_yourself}"
                            </div>
                          )}
                        </div>

                        {app.status === 'pending' && (
                          <div className="flex gap-2 mt-4">
                            <Button size="sm" className="flex-1 gap-1" onClick={() => handleApprove(app)} disabled={processing}>
                              <CheckCircle className="h-4 w-4" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1 gap-1" onClick={() => { setReviewApp(app); setRejectionReason(''); }} disabled={processing}>
                              <XCircle className="h-4 w-4" /> Reject
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="all">
                <Card><CardContent className="p-2 divide-y divide-border">
                  {allUsers.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">No users found</p> : allUsers.map(u => <UserCard key={u.id} u={u} />)}
                </CardContent></Card>
              </TabsContent>

              <TabsContent value="creators">
                <Card><CardContent className="p-2 divide-y divide-border">
                  {creators.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">No creators yet</p> : creators.map(u => <UserCard key={u.id} u={u} />)}
                </CardContent></Card>
              </TabsContent>

              <TabsContent value="admins">
                <Card><CardContent className="p-2 divide-y divide-border">
                  {admins.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">No admins found</p> : admins.map(u => <UserCard key={u.id} u={u} />)}
                </CardContent></Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* ── Rejection dialog ── */}
      <Dialog open={!!reviewApp} onOpenChange={open => { if (!open) { setReviewApp(null); setRejectionReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application — {reviewApp?.profile?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Provide a reason. This will be shown to the applicant in their creator portal.</p>
            <Textarea
              placeholder="e.g. Follower count doesn't meet our current requirements. Feel free to reapply once you've grown your audience."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewApp(null); setRejectionReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => reviewApp && handleReject(reviewApp)} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
