import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, DollarSign, TrendingUp, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AuthErrorBanner } from '@/components/AuthErrorBanner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const NICHES = [
  'Fitness & Health', 'Music & Entertainment', 'Lifestyle & Fashion',
  'Gaming', 'Beauty & Makeup', 'Travel', 'Food & Cooking',
  'Finance & Business', 'Art & Design', 'Comedy & Memes',
  'Sports', 'Education', 'Tech', 'Other',
];

const FOLLOWER_RANGES = [
  'Under 10k', '10k – 50k', '50k – 100k',
  '100k – 500k', '500k – 1M', 'Over 1M',
];

const CreatorAuth = () => {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const { isCreator, loading: roleLoading } = useRoleCheck();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Controlled tabs so we can programmatically switch users to "Apply" if
  // they try to sign in without an existing application.
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Step-based signup
  const [step, setStep] = useState<'account' | 'application'>('account');
  const [accountData, setAccountData] = useState<{ email: string; password: string; username: string; displayName: string } | null>(null);

  // Application fields
  const [instagramHandle, setInstagramHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [followerRange, setFollowerRange] = useState('');
  const [niche, setNiche] = useState('');
  const [aboutYourself, setAboutYourself] = useState('');

  useEffect(() => {
    if (!loading && !roleLoading && user && isCreator) {
      navigate('/dashboard');
    }
  }, [user, loading, roleLoading, isCreator, navigate]);

  const handleAccountStep = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('signup-email') as string,
      password: formData.get('signup-password') as string,
      username: formData.get('username') as string,
      displayName: formData.get('displayName') as string,
    };

    try {
      signUpSchema.parse(data);
      setAccountData(data);
      setStep('application');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
      }
    }
  };

  const handleApplicationSubmit = async () => {
    if (!accountData) return;

    if (!instagramHandle && !tiktokHandle && !twitterHandle) {
      toast({ title: 'Social profile required', description: 'Please provide at least one social media handle so we can review your application.', variant: 'destructive' });
      return;
    }
    if (!followerRange) {
      toast({ title: 'Follower count required', description: 'Please select your approximate follower count.', variant: 'destructive' });
      return;
    }
    if (!niche) {
      toast({ title: 'Content niche required', description: 'Please select your primary content niche.', variant: 'destructive' });
      return;
    }
    if (aboutYourself.trim().length < 20) {
      toast({ title: 'Tell us about yourself', description: 'Please write at least a sentence about yourself and your audience.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Sign out any stale session before creating a new account. If a
      // previous login is present in localStorage, the GoTrueClient's
      // auto-refresh ticker can call _removeSession() concurrently with
      // signUp()'s code_verifier write, wiping the PKCE verifier before
      // the confirmation link is ever clicked (LB#4). Signing out first
      // ensures a clean slate — no concurrent token refresh can race.
      await supabase.auth.signOut();

      // Create auth account (no creator role yet — pending approval)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accountData.email,
        password: accountData.password,
        options: {
          // PKCE callback — the email link lands at /auth/callback which
          // exchanges ?code= for a session, submits the cached application
          // RPC, then navigates to /creator-application-pending.
          emailRedirectTo: `${window.location.origin}/auth/callback?intent=creator`,
          data: {
            username: accountData.username,
            display_name: accountData.displayName,
            role: 'fan', // fan by default until admin approves
          },
        },
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Account creation failed');

      // Submit application via SECURITY DEFINER RPC so any failure surfaces
      // as a real error instead of being swallowed at the REST layer.
      const submitApplication = async () => {
        const { data, error } = await supabase.rpc('submit_creator_application', {
          p_instagram: instagramHandle || null,
          p_tiktok: tiktokHandle || null,
          p_twitter: twitterHandle || null,
          p_follower_range: followerRange,
          p_niche: niche,
          p_about: aboutYourself,
        });
        if (error) throw new Error(error.message);
        const result = data as { success: boolean; error?: string } | null;
        if (!result?.success) throw new Error(result?.error || 'Application submission failed');
      };

      if (authData.session) {
        // Email confirmation off — user is active immediately
        await submitApplication();
        setSignupSuccess(true);
      } else {
        // Email confirmation required — store application data in localStorage
        // and complete submission after they confirm (handled on login)
        localStorage.setItem(`creator_application_${userId}`, JSON.stringify({
          instagram_handle: instagramHandle || null,
          tiktok_handle: tiktokHandle || null,
          twitter_handle: twitterHandle || null,
          follower_count: followerRange,
          content_niche: niche,
          about_yourself: aboutYourself,
        }));
        setSignupSuccess(true);
      }
    } catch (error: any) {
      toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
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

      if (result.error) throw new Error(result.error.message);

      if (result.data?.user) {
        const uid = result.data.user.id;

        // If there's a pending application stored locally (post email-confirm), submit it now
        const storedApp = localStorage.getItem(`creator_application_${uid}`);
        if (storedApp) {
          const appData = JSON.parse(storedApp);
          const { data, error } = await supabase.rpc('submit_creator_application', {
            p_instagram: appData.instagram_handle ?? null,
            p_tiktok: appData.tiktok_handle ?? null,
            p_twitter: appData.twitter_handle ?? null,
            p_follower_range: appData.follower_count ?? null,
            p_niche: appData.content_niche ?? null,
            p_about: appData.about_yourself ?? null,
          });
          if (error) throw new Error(error.message);
          const result = data as { success: boolean; error?: string } | null;
          if (!result?.success) throw new Error(result?.error || 'Application submission failed');
          localStorage.removeItem(`creator_application_${uid}`);
        }

        // Check creator role
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', uid)
          .eq('role', 'creator');

        if (roles && roles.length > 0) {
          toast({ title: 'Welcome back!', description: "You've signed in as a creator." });
          navigate('/dashboard');
        } else {
          // Look up the verification row. maybeSingle() returns null instead of
          // throwing when zero rows exist — we explicitly distinguish the cases.
          const { data: verification } = await supabase
            .from('creator_verifications')
            .select('status')
            .eq('creator_id', uid)
            .maybeSingle();

          if (verification?.status === 'pending') {
            navigate('/creator-application-pending');
          } else if (verification?.status === 'rejected') {
            await supabase.auth.signOut();
            toast({
              title: 'Application not approved',
              description: 'Your creator application was not approved. Please contact support.',
              variant: 'destructive',
            });
          } else {
            // No application exists yet — do NOT fake "Application Under Review".
            // Send the user back to the apply form with a clear toast.
            toast({
              title: 'No application on file',
              description: "You haven't submitted a creator application yet. Please apply below.",
            });
            setMode('signup');
            setStep('account');
          }
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-center mb-3">
                <Clock className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Application Submitted!</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Thanks for applying! We review every creator application manually. You'll receive an email within <strong>1–3 business days</strong> once your account has been reviewed.
              </p>
              <p className="text-sm text-muted-foreground">
                If you haven't confirmed your email yet, please check your inbox first.
              </p>
              <Button className="w-full" onClick={() => { setSignupSuccess(false); setStep('account'); }}>
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
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
                <span>75% revenue share</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>Own your audience</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AuthErrorBanner intent="creator" />
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'signin' | 'signup')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Apply</TabsTrigger>
              </TabsList>

              {/* ── SIGN IN ── */}
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" name="signin-email" type="email" placeholder="creator@example.com" required />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input id="signin-password" name="signin-password" type="password" required />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting || loading || roleLoading}>
                    {isSubmitting || loading || roleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
                  </Button>
                  <div className="text-center text-sm">
                    <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
                  </div>
                </form>
              </TabsContent>

              {/* ── SIGN UP: step 1 account details ── */}
              <TabsContent value="signup">
                {step === 'account' && (
                  <form onSubmit={handleAccountStep} className="space-y-4">
                    <p className="text-sm text-muted-foreground pb-1">Step 1 of 2 — Account details</p>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" name="username" placeholder="creator_name" required />
                      {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input id="displayName" name="displayName" placeholder="Your Name" required />
                      {errors.displayName && <p className="text-sm text-destructive">{errors.displayName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" name="signup-email" type="email" placeholder="creator@example.com" required />
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" name="signup-password" type="password" required />
                      {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={loading || roleLoading}>Next: Application Details →</Button>
                  </form>
                )}

                {/* ── SIGN UP: step 2 application ── */}
                {step === 'application' && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground pb-1">Step 2 of 2 — Creator application</p>

                    <div className="space-y-2">
                      <Label>Instagram Handle</Label>
                      <Input placeholder="@yourhandle" value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>TikTok Handle <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Input placeholder="@yourhandle" value={tiktokHandle} onChange={e => setTiktokHandle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>X / Twitter Handle <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Input placeholder="@yourhandle" value={twitterHandle} onChange={e => setTwitterHandle(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label>Total Followers (across platforms) *</Label>
                      <Select value={followerRange} onValueChange={setFollowerRange}>
                        <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                        <SelectContent>
                          {FOLLOWER_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Content Niche *</Label>
                      <Select value={niche} onValueChange={setNiche}>
                        <SelectTrigger><SelectValue placeholder="Select your niche" /></SelectTrigger>
                        <SelectContent>
                          {NICHES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>About you & your audience *</Label>
                      <Textarea
                        placeholder="Tell us about yourself and why you want to join. What kind of content do you create? Who is your audience?"
                        value={aboutYourself}
                        onChange={e => setAboutYourself(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setStep('account')} className="flex-1">← Back</Button>
                      <Button onClick={handleApplicationSubmit} disabled={isSubmitting} className="flex-1">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Application'}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/" className="text-primary hover:underline">← Back to home</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreatorAuth;
