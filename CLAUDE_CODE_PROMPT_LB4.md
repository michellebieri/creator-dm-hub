TASK: Fix LB#4 — Frontend PKCE code_verifier not persisted on signup at /creator-auth Apply.

REPO: /Users/michellebieri/Desktop/Coding/dmme (origin/main, Vercel auto-deploy)
SUPABASE PROJECT: jhzcmdsaajvftjbhdunt (DM ME, production)
LAST DEPLOY: commit 45a670d ("fix(LB#2): PKCE email-confirmation + #error= banner") — landed but PKCE bug below.

READ FIRST (in this order):
1. PROJECT_STATE.md — full project context, source of truth
2. HANDOFF_2026-05-16.md — compact state, see LB#4 entry
3. QA_REPORT_2026-05-15_round2.md — prior round findings

EVIDENCE OF THE BUG (from CoWork QA session 2026-05-17):
- Fresh signup at /creator-auth Apply form using michellebieriuae+r4smtp@gmail.com (real Gmail) succeeded server-side
- Confirmation email delivered fine from DM.me <noreply@dm-me.io> (LB#3 is closed)
- User clicked confirmation link in SAME browser that initiated signup
- Supabase /auth/v1/verify endpoint validated the PKCE token + flipped user to confirmed (Users panel shows Confirmed at 13:23, UID 263194c0-a6e1-426a-9aee-e938d2fbfadf)
- Frontend /auth/callback then called exchangeCodeForSession() which FAILED with:
    "Server: invalid request: both auth code and code verifier should be non-empty"
- AuthErrorBanner correctly surfaced the error + Resend CTA (the banner half of 45a670d works)
- localStorage dump in the SAME browser AFTER signup showed ZERO supabase keys:
    Only: creator_application_<uuid> cache keys, i18nextLng, __vercel_toolbar_injector, pusherTransportTLS
    Missing: sb-jhzcmdsaajvftjbhdunt-auth-token-code-verifier (or whatever the verifier key is)

ROOT CAUSE HYPOTHESES (in order of likelihood):
1. Supabase client in src/integrations/supabase/client.ts is missing flowType: 'pkce' OR has it but storage adapter is wrong
2. createClient() is being called in multiple files with inconsistent config — the one used by submitApplication isn't the PKCE-configured one
3. submit_creator_application RPC path doesn't go through supabase.auth.signUp from the PKCE client (maybe it constructs a fresh client, or uses the admin API somehow)
4. flowType is set but persistSession: false is also set, so the verifier never gets written

INVESTIGATION STEPS (do these in order, don't skip):
1. grep -rn "createClient" src/ — list every place the Supabase client is instantiated. Should be ONE place only.
2. Read src/integrations/supabase/client.ts fully. Confirm the auth options object contains:
     { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage }
3. Read src/pages/CreatorAuth.tsx, specifically the submitApplication function. Confirm:
     a. It calls supabase.auth.signUp({ email, password, options: { emailRedirectTo: '...auth/callback?intent=creator' } }) from the shared client
     b. It does NOT bypass the shared client (no inline createClient, no admin.createUser)
     c. It does NOT call signUp with a separate options object that overrides flowType
4. Read src/pages/AuthCallback.tsx. Confirm:
     a. It reads ?code= from URL
     b. It calls supabase.auth.exchangeCodeForSession(code) from the SAME shared client (not a fresh instance)
     c. It does NOT clear localStorage anywhere before the exchange
5. Open Vercel deploy of 45a670d and run a fresh signup in your local browser → open DevTools → Application → Local Storage → check whether sb-jhzcmdsaajvftjbhdunt-auth-token-code-verifier exists immediately after submit. If yes locally but not in CoWork's controlled browser, that's a clue. If no locally either, the client config is wrong.

DELIVERABLE:
- Patch the root cause (probably 1-3 lines in src/integrations/supabase/client.ts)
- DO NOT band-aid by calling supabase.auth.signUp from a freshly-instantiated client
- DO NOT add a code_verifier polyfill — fix the actual config
- After the patch, write a one-shot test script at .qa/lb4_pkce_verifier.mjs that:
    a. Calls supabase.auth.signUp with a unique test email
    b. Immediately reads the storage adapter to assert the code_verifier key exists and is non-empty
    c. Logs PASS / FAIL with the verifier prefix (don't log full value)
- Update PROJECT_STATE.md "Resolved issues" section with the fix
- Commit message format: fix(LB#4): persist code_verifier on signup — <root cause one-liner>

CONSTRAINTS (non-negotiable):
- Platform-wide fix only. No Michelle-only patches. No hardcoded UUIDs.
- No data-level band-aids. If something only works for fresh users via UI, fix the system.
- SQL writes require explicit user OK. Reads are free.
- Every applied SQL needs a matching migration file in supabase/migrations/.
- Surface real errors. No generic toasts.
- TIME BUDGET: If investigation exceeds 30 minutes without root cause identified, STOP and report findings. Don't go deep on theory — surface what you've ruled out and let the operator decide next steps.

DO NOT TOUCH (already working, don't regress):
- Resend SMTP config in Supabase (host smtp.resend.com, sender noreply@dm-me.io, sender name DM.me — confirmed working today)
- The AuthErrorBanner component (renders correctly, leave it)
- Migrations 20260515000001-5 (LB#1 admin pipeline, all applied)
- The Confirm email toggle in Supabase (must stay ON)

VERIFICATION CRITERIA (CoWork will re-test):
- Fresh signup at /creator-auth Apply with a real Gmail
- Browser localStorage immediately contains sb-jhzcmdsaajvftjbhdunt-auth-token-code-verifier (non-empty)
- Click confirmation email link in SAME browser → lands on /creator-application-pending (NOT AuthErrorBanner)
- URL has no #error= fragment
- Supabase Users panel shows Confirmed at matching click time
- Stale-link regression: clicking same link in a DIFFERENT browser → AuthErrorBanner WITH Resend CTA, Resend works

GO.
