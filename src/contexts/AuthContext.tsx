import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string, displayName: string, role: 'creator' | 'customer') => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    username: string,
    displayName: string,
    role: 'creator' | 'customer'
  ) => {
    try {
      // Sign out any stale session before signUp so no concurrent token
      // refresh can race with the PKCE code_verifier write (LB#4).
      await supabase.auth.signOut();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // PKCE callback — the link in the confirmation email lands here,
          // exchanges ?code= for a session, then navigates to /dashboard.
          emailRedirectTo: `${window.location.origin}/auth/callback?intent=customer`,
          data: { username, display_name: displayName, role },
        },
      });

      if (error) throw error;

      if (data.session) {
        // Email confirmation disabled — user is signed in immediately
        toast({
          title: 'Account created!',
          description: "Welcome to DM.me! You're all set.",
        });
      } else {
        // Email confirmation required
        toast({
          title: 'Account created!',
          description: 'Welcome to DM.me! Check your email to confirm your account.',
        });
      }

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: 'Sign up failed',
        description: error?.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      toast({
        title: 'Welcome back!',
        description: "You've successfully signed in.",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      setSession(null);
      setUser(null);
      const { error } = await supabase.auth.signOut();
      if (error && error.message !== 'Session not found') throw error;

      toast({ title: 'Signed out', description: "You've been successfully signed out." });
    } catch (error: any) {
      setSession(null);
      setUser(null);
      toast({ title: 'Sign out failed', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
