import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Monitor, Smartphone, Loader2, LogOut, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Session {
  id: string;
  device_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_active: string;
  created_at: string;
}

const SessionManagement = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [terminating, setTerminating] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchSessions();
    }
  }, [user, loading, navigate]);

  const fetchSessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_active', { ascending: false });

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sessions",
        variant: "destructive",
      });
    } finally {
      setLoadingSessions(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    setTerminating(sessionId);
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Session terminated",
        description: "The session has been successfully terminated",
      });

      await fetchSessions();
    } catch (error) {
      console.error('Error terminating session:', error);
      toast({
        title: "Error",
        description: "Failed to terminate session",
        variant: "destructive",
      });
    } finally {
      setTerminating(null);
    }
  };

  const terminateAllSessions = async () => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user!.id);

      if (error) throw error;

      toast({
        title: "All sessions terminated",
        description: "You will be signed out",
      });

      // Sign out user
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error terminating all sessions:', error);
      toast({
        title: "Error",
        description: "Failed to terminate all sessions",
        variant: "destructive",
      });
    }
  };

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Monitor className="h-5 w-5" />;
    if (userAgent.toLowerCase().includes('mobile')) {
      return <Smartphone className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const getDeviceName = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown Device';
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    if (userAgent.includes('Edge')) return 'Edge Browser';
    return 'Unknown Browser';
  };

  if (loading || loadingSessions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Session Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your active sessions and sign out remotely
          </p>
        </div>
        {sessions.length > 0 && (
          <Button variant="destructive" onClick={terminateAllSessions}>
            Terminate All Sessions
          </Button>
        )}
      </div>

      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          For security, we recommend terminating sessions on devices you no longer use.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No active sessions found
            </p>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-muted rounded-lg">
                      {getDeviceIcon(session.user_agent)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">
                          {session.device_name || getDeviceName(session.user_agent)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          Current
                        </Badge>
                      </div>
                      {session.ip_address && (
                        <p className="text-sm text-muted-foreground">
                          IP: {session.ip_address}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Last active: {new Date(session.last_active).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(session.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => terminateSession(session.id)}
                    disabled={terminating === session.id}
                  >
                    {terminating === session.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        Terminate
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          <strong>Note:</strong> Session tracking is limited in this demo. In production, sessions would be automatically tracked with device fingerprinting and IP logging.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SessionManagement;
