import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Download, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AccountSettings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      // Fetch all user data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', user?.id);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', user?.id);

      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: user?.id,
        email: user?.email,
        profile,
        messages,
        transactions,
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dm-me-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    try {
      // Delete user data
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(user?.id || '');
      if (authError) throw authError;

      toast.success('Account deleted successfully');
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account. Please contact support.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
        <p className="text-muted-foreground">Manage your account data and preferences</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              <CardTitle>Export Your Data</CardTitle>
            </div>
            <CardDescription>
              Download a copy of all your data in JSON format (GDPR compliant)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This will include your profile information, messages, transactions, and other data associated with your account.
            </p>
            <Button onClick={handleExportData} disabled={exporting}>
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export My Data'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </div>
            <CardDescription>
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account Permanently?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>This action cannot be undone. This will permanently delete your account and remove all your data from our servers.</p>
                    <p>All your:</p>
                    <ul className="list-disc list-inside ml-4">
                      <li>Messages and conversations</li>
                      <li>Purchased content</li>
                      <li>Transaction history</li>
                      <li>Profile information</li>
                    </ul>
                    <p>will be permanently deleted.</p>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="delete-confirm">
                        Type <strong>DELETE</strong> to confirm
                      </Label>
                      <Input
                        id="delete-confirm"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="Type DELETE here"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmation !== 'DELETE' || deleting}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deleting ? 'Deleting...' : 'Delete My Account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountSettings;
