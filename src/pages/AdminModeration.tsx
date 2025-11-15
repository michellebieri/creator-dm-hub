import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, AlertTriangle, Flag, FileText, Ban, CheckCircle, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserReport {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter: { username: string; display_name: string; avatar_url: string | null };
  reported_user: { id: string; username: string; display_name: string; avatar_url: string | null };
}

interface DMCAClaim {
  id: string;
  claimant_name: string;
  claimant_email: string;
  description: string;
  status: string;
  created_at: string;
  unlockable: { id: string; media_type: string; media_url: string } | null;
}

const AdminModeration = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [dmcaClaims, setDmcaClaims] = useState<DMCAClaim[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'report' | 'dmca'; id: string; action: string } | null>(null);
  const [processing, setProcessing] = useState(false);

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
      const { data: hasAdminRole, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (error || !hasAdminRole) {
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
      // Fetch user reports - need to check if this table exists
      const { data: reportsData, error: reportsError } = await supabase
        .from('user_reports')
        .select(`
          *,
          reporter:profiles!user_reports_reporter_id_fkey(username, display_name, avatar_url),
          reported_user:profiles!user_reports_reported_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (reportsError) {
        console.error('Reports error:', reportsError);
      } else {
        setReports(reportsData || []);
      }

      // Fetch DMCA claims
      const { data: dmcaData, error: dmcaError } = await supabase
        .from('dmca_claims')
        .select(`
          *,
          unlockable:unlockables(id, media_type, media_url)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (dmcaError) {
        console.error('DMCA error:', dmcaError);
      } else {
        setDmcaClaims(dmcaData || []);
      }
    } catch (error) {
      console.error('Error fetching moderation data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch moderation data",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleAction = (type: 'report' | 'dmca', id: string, action: string) => {
    setSelectedItem({ type, id, action });
    setActionDialogOpen(true);
  };

  const executeAction = async () => {
    if (!selectedItem) return;

    setProcessing(true);
    try {
      const { type, id, action } = selectedItem;

      if (type === 'report') {
        // Update report status
        const { error } = await supabase
          .from('user_reports')
          .update({ status: action, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;

        // If approved, take action on reported user (e.g., ban, warning)
        if (action === 'approved') {
          const report = reports.find(r => r.id === id);
          if (report) {
            // You could add additional actions here like banning the user
            toast({
              title: "Action taken",
              description: `Report has been approved. Consider taking further action on user @${report.reported_user.username}`,
            });
          }
        }
      } else if (type === 'dmca') {
        // Update DMCA claim status
        const { error } = await supabase
          .from('dmca_claims')
          .update({ status: action, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;

        // If approved, delete the content
        if (action === 'approved') {
          const claim = dmcaClaims.find(c => c.id === id);
          if (claim?.unlockable) {
            const { error: deleteError } = await supabase
              .from('unlockables')
              .delete()
              .eq('id', claim.unlockable.id);

            if (deleteError) throw deleteError;
          }
        }
      }

      toast({
        title: "Success",
        description: `${type === 'report' ? 'Report' : 'DMCA claim'} has been ${action}`,
      });

      setActionDialogOpen(false);
      setSelectedItem(null);
      await fetchData();
    } catch (error) {
      console.error('Error executing action:', error);
      toast({
        title: "Error",
        description: "Failed to execute action",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading || checking || loadingData) {
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
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Content Moderation</h1>
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            User Reports ({reports.length})
          </TabsTrigger>
          <TabsTrigger value="dmca" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            DMCA Claims ({dmcaClaims.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending User Reports</CardTitle>
              <CardDescription>Review and take action on user reports</CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                  <p>No pending reports</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <Avatar>
                            <AvatarImage src={report.reported_user.avatar_url || undefined} />
                            <AvatarFallback>
                              {report.reported_user.display_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{report.reported_user.display_name}</p>
                              <Badge variant="outline">@{report.reported_user.username}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <span>Reported by @{report.reporter.username}</span>
                              <span>•</span>
                              <span>{new Date(report.created_at).toLocaleDateString()}</span>
                            </div>
                            <Badge variant="secondary">{report.reason}</Badge>
                            {report.description && (
                              <p className="text-sm mt-2 text-muted-foreground">{report.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleAction('report', report.id, 'approved')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction('report', report.id, 'rejected')}
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/creator/${report.reported_user.username}`)}
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dmca" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending DMCA Claims</CardTitle>
              <CardDescription>Review and take action on copyright claims</CardDescription>
            </CardHeader>
            <CardContent>
              {dmcaClaims.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                  <p>No pending DMCA claims</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dmcaClaims.map((claim) => (
                    <div key={claim.id} className="border rounded-lg p-4 space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-warning" />
                          <p className="font-medium">Copyright Claim</p>
                        </div>
                        <div className="text-sm space-y-1">
                          <p><strong>Claimant:</strong> {claim.claimant_name}</p>
                          <p><strong>Email:</strong> {claim.claimant_email}</p>
                          <p><strong>Media Type:</strong> {claim.unlockable?.media_type || 'Unknown'}</p>
                          <p><strong>Filed:</strong> {new Date(claim.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm font-medium mb-1">Description:</p>
                          <p className="text-sm text-muted-foreground">{claim.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction('dmca', claim.id, 'approved')}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Approve & Delete Content
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction('dmca', claim.id, 'rejected')}
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Reject Claim
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {selectedItem?.action} this {selectedItem?.type}?
              {selectedItem?.action === 'approved' && selectedItem?.type === 'dmca' && (
                <span className="block mt-2 text-warning font-medium">
                  This will permanently delete the reported content.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminModeration;
