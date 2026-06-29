import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * PKCE email-confirmation callback.
 *
 * Supabase redirects here after the user clicks the confirmation link in their
 * email. The URL contains a one-time `?code=...` that must be exchanged for a
 * session — the exchange requires the originating client's `code_verifier`
 * stored in localStorage, so email-client prefetchers (Gmail safelinks, etc.)
 * cannot complete it. See LB#2 in PROJECT_STATE.md.
 *
 * Also handles the legacy `#error=...` fragment that Supabase appends when the
 * confirmation link is expired/invalid — forwards to the relevant auth page
 * so the AuthErrorBanner can render a helpful message + Resend CTA.
 *
 * `?intent=creator|customer` chooses the post-confirm destination + which
 * auth page to fall back to on error.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'exchanging' | 'submitting' | 'error'>('exchanging');

  useEffect(() => {
    const run = async () => {
      const intent = (params.get('intent') === 'creator' ? 'creator' : 'customer') as 'creator' | 'customer';
      const errorParam = params.get('error') || params.get('error_code');
      const code = params.get('code');

      const authPage = intent === 'creator' ? '/creator-auth' : '/auth';

      // Hash-fragment error (legacy implicit flow leftovers) — forward intact.
      if (typeof window !== 'undefined' && window.location.hash.includes('error')) {
        navigate(`${authPage}${window.location.hash}`, { replace: true });
        return;
      }

      // Query-param error from PKCE failure — forward as hash fragment.
      if (errorParam) {
        const qs = window.location.search.replace(/^\?/, '');
        navigate(`${authPage}#${qs}`, { replace: true });
        return;
      }

      if (!code) {
        navigate(`${authPage}#error=missing_code&error_description=Confirmation+link+is+missing+the+verification+code.`, { replace: true });
        return;
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data?.session) {
        // Code already used — check if the user is already confirmed/logged in
        // in this browser (e.g. they double-clicked the link).
        const { data: existing } = await supabase.auth.getSession();
        if (existing?.session) {
          // Already confirmed and signed in — send them where they need to go.
          if (intent === 'creator') {
            navigate('/creator-application-pending', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
          return;
        }
        const msg = encodeURIComponent(error?.message || 'Could not complete email confirmation.');
        navigate(`${authPage}#error=access_denied&error_code=exchange_failed&error_description=${msg}`, { replace: true });
        return;
      }

      // For creator signups, complete the cached application now that we have
      // a session. The data was stored under `creator_application_${uid}` in
      // CreatorAuth's signUp step.
      if (intent === 'creator') {
        const uid = data.session.user.id;
        const storedRaw = localStorage.getItem(`creator_application_${uid}`);
        if (storedRaw) {
          setStatus('submitting');
          try {
            const stored = JSON.parse(storedRaw);
            const { data: rpcData, error: rpcError } = await supabase.rpc('submit_creator_application', {
              p_instagram: stored.instagram_handle ?? null,
              p_tiktok: stored.tiktok_handle ?? null,
              p_twitter: stored.twitter_handle ?? null,
              p_follower_range: stored.follower_count ?? null,
              p_niche: stored.content_niche ?? null,
              p_about: stored.about_yourself ?? null,
            });
            if (rpcError) throw new Error(rpcError.message);
            const res = rpcData as { success: boolean; error?: string } | null;
            if (!res?.success) throw new Error(res?.error || 'Application submission failed');
            localStorage.removeItem(`creator_application_${uid}`);
          } catch (err) {
            // Don't strand the user — log them in and let them retry from
            // the apply form. The CreatorAuth handleSignIn no-row branch
            // already prompts for re-application.
            console.error('Deferred creator application submit failed:', err);
          }
        }
        navigate('/creator-application-pending', { replace: true });
        return;
      }

      // Password recovery flow — redirect to reset form instead of dashboard.
      const type = params.get('type');
      if (type === 'recovery') {
        navigate('/reset-password', { replace: true });
        return;
      }

      navigate('/dashboard', { replace: true });
    };

    run().catch(() => {
      setStatus('error');
    });
  }, [navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-3 max-w-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">
          {status === 'submitting' ? 'Finishing your application…' : 'Confirming your email…'}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
