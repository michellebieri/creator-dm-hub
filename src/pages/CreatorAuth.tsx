import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle, Loader2, DollarSign, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(50),
  verificationCode: z.string().optional(),
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const CreatorAuth = () => {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const { isCreator, loading: roleLoading } = useRoleCheck();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailSent, setEmailSent] = useState(false);
  const [pendingSignupData, setPendingSignupData] = useState<any>(null);

  useEffect(() => {
    if (!loading && !roleLoading && user && isCreator) {
      navigate('/dashboard');
    }
  }, [user, loading, roleLoading, isCreator, navigate]);

  const handleSendVerification = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('signup-email') as string,
      password: formData.get('signup-password') as string,
      username: formData.get('username') as string,
      displayName: formData.get('displayName') as string,
    };

    try {
      signUpSchema.omit({ verificationCode: true }).parse(data);
      
      // Store signup data for later
      setPendingSignupData(data);
      
      // Send verification email via Supabase
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          shouldCreateUser: false,
        }
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Verification email sent",
        description: "Please check your email for the verification code",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!pendingSignupData) return;

    setIsSubmitting(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const verificationCode = formData.get('verificationCode') as string;

    try {
      // Verify OTP
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: pendingSignupData.email,
        token: verificationCode,
        type: 'email',
      });

      if (verifyError) throw verifyError;

      // Now create the account
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { data, error } = await supabase.auth.signUp({
        email: pendingSignupData.email,
        password: pendingSignupData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: pendingSignupData.username,
            display_name: pendingSignupData.displayName,
            role: 'creator'
          }
        }
      });

      if (error) throw error;

      // Assign creator role
      if (data.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: 'creator'
          });

        if (roleError) console.error('Role assignment error:', roleError);
      }

      toast({
        title: "Account created!",
        description: "Welcome to DM.me - You can now start earning",
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('signin-email') as string,
      password: formData.get('signin-password') as string,
    };

    try {
      signInSchema.parse(data);
      const result = await signIn(data.email, data.password);
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      // Check if user has creator role
      if (result.data?.user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', result.data.user.id)
          .eq('role', 'creator');

        if (!roles || roles.length === 0) {
          await supabase.auth.signOut();
          throw new Error('This account is not registered as a creator');
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-4">
            <DollarSign className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold">Creator Portal</h1>
          </div>
          <p className="text-muted-foreground">Turn your DMs into income</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader>
            <div className="flex justify-center gap-8 mb-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span>80% revenue share</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>Own your audience</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="signin-email"
                      type="email"
                      placeholder="creator@example.com"
                      required
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      name="signin-password"
                      type="password"
                      required
                    />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                  </Button>
                  <div className="text-center text-sm">
                    <Link to="/forgot-password" className="text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {!emailSent ? (
                  <form onSubmit={handleSendVerification} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        placeholder="creator_name"
                        required
                      />
                      {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        name="displayName"
                        placeholder="Creator Name"
                        required
                      />
                      {errors.displayName && <p className="text-sm text-destructive">{errors.displayName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        name="signup-email"
                        type="email"
                        placeholder="creator@example.com"
                        required
                      />
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        name="signup-password"
                        type="password"
                        required
                      />
                      {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Verification Code"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyAndSignUp} className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4 p-4 bg-muted rounded">
                      We've sent a verification code to <strong>{pendingSignupData?.email}</strong>. Please enter it below to complete your registration.
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verificationCode">Verification Code</Label>
                      <Input
                        id="verificationCode"
                        name="verificationCode"
                        placeholder="Enter 6-digit code"
                        required
                        maxLength={6}
                      />
                      {errors.verificationCode && <p className="text-sm text-destructive">{errors.verificationCode}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Create Account"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="w-full" 
                      onClick={() => setEmailSent(false)}
                    >
                      Change Email
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/" className="text-primary hover:underline">
                ← Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreatorAuth;
