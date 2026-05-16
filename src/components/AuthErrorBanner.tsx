import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Parses `#error=…` (or `?error=…`) on /auth and /creator-auth mount and
 * renders a helpful banner when an email confirmation link has expired or
 * been pre-consumed by an email-client safelinks scanner. Provides a Resend
 * CTA that the user can drive without retyping their full signup info.
 *
 * This sits ABOVE the sign-in / apply forms; it doesn't change them.
 *
 * Why we need this even with PKCE in place: real users can still arrive here
 * from old/stale confirmation links, links opened on the wrong device
 * (different localStorage → no code_verifier), or from password-reset emails
 * with expired tokens.
 */
type Props = {
  /** Where Resend's emailRedirectTo should send the user after they click the new link. */
  intent: 'creator' | 'customer';
};

const FRIENDLY: Record<string, string> = {
  otp_expired: 'Your confirmation link has already been used or expired.',
  access_denied: 'Your confirmation link has already been used or expired.',
  exchange_failed: 'We couldn\'t complete the email confirmation in this browser.',
  missing_code: 'That link is missing the confirmation code.',
};

export const AuthErrorBanner = ({ intent }: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const params = useMemo(() => {
    if (typeof window === 'undefined') return null;
    // Supabase emits errors in the URL fragment for implicit flow and as
    // query string for PKCE. Check both.
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const fromHash = new URLSearchParams(hash);
    const fromQuery = new URLSearchParams(window.location.search);
    if (fromHash.get('error') || fromHash.get('error_code')) return fromHash;
    if (fromQuery.get('error') || fromQuery.get('error_code')) return fromQuery;
    return null;
  }, [location.hash, location.search]);

  const errorCode = params?.get('error_code') || params?.get('error') || '';
  const errorDescription = params?.get('error_description')?.replace(/\+/g, ' ') || '';
  const hasError = !!errorCode;

  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Auto-clear the fragment from the address bar so refreshes don't replay.
  // We keep the banner up via state instead.
  const [persistedError] = useState(() => hasError ? { code: errorCode, description: errorDescription } : null);
  useEffect(() => {
    if (hasError) {
      const url = new URL(window.location.href);
      url.hash = '';
      url.search = '';
      window.history.replaceState({}, '', url.toString());
    }
  }, [hasError]);

  if (!persistedError) return null;

  const friendly = FRIENDLY[persistedError.code] || 'Email confirmation failed.';

  const handleResend = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Enter your email', description: 'We need your email to send a new confirmation link.', variant: 'destructive' });
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?intent=${intent}`,
        },
      });
      if (error) throw error;
      setResent(true);
      toast({ title: 'New confirmation email sent', description: 'Check your inbox (and spam folder) for the new link.' });
    } catch (err: any) {
      // Supabase intentionally returns a generic error for non-existent users
      // (anti-enumeration). Show the actual message if there is one.
      toast({ title: 'Could not resend', description: err?.message || 'Try signing in — your account may already be confirmed.', variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 mb-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold">{friendly}</p>
          <p className="text-xs text-muted-foreground mt-1">
            If you signed up recently, your account may already be confirmed — try signing in below.
            Otherwise enter your email and we'll send a new confirmation link.
          </p>
          {persistedError.description && persistedError.description !== friendly && (
            <p className="text-[10px] text-muted-foreground/70 mt-1">Server: {persistedError.description}</p>
          )}
        </div>
      </div>

      {resent ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <MailCheck className="h-4 w-4" />
          New confirmation email sent — check your inbox.
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="resend-email" className="text-xs">Your email</Label>
          <div className="flex gap-2">
            <Input
              id="resend-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={handleResend} disabled={resending}>
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resend'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
