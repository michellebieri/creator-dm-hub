/**
 * LB#4 — PKCE code_verifier persistence smoke test
 *
 * Verifies that supabase.auth.signUp() with flowType:'pkce' writes the
 * code_verifier key to the storage adapter immediately after the call.
 *
 * This is a Node.js script using the same supabase-js package as the app.
 * It simulates what the browser does but without the DOM — the key check is
 * that getCodeChallengeAndMethod() runs and persists the verifier, and that
 * nothing in the signUp code path clears it.
 *
 * Run:  node .qa/lb4_pkce_verifier.mjs
 *
 * Environment variables required (same as .env):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY  (or VITE_SUPABASE_ANON_KEY)
 */

import { createClient } from '@supabase/supabase-js';

// ── env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    'FAIL — Missing env vars. Export VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
  );
  process.exit(1);
}

// ── In-memory storage adapter (mirrors what the browser client does) ─────────
// We can't use window.localStorage in Node, so we use a Map-backed adapter
// that mirrors the SupportedStorage interface. If the supabase client is
// misconfigured (e.g., persistSession:false or wrong flowType), nothing will
// be written here after signUp.
const memStore = new Map();
const storageAdapter = {
  getItem: (key) => memStore.get(key) ?? null,
  setItem: (key, value) => { memStore.set(key, value); },
  removeItem: (key) => { memStore.delete(key); },
};

// ── Client — mirrors src/integrations/supabase/client.ts ────────────────────
// NOTE: storage adapter is explicitly provided here because Node has no
// window.localStorage. The browser client does NOT pass storage explicitly
// after the LB#4 fix — it lets supportsLocalStorage() auto-detect.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storageAdapter,
    persistSession: true,
    autoRefreshToken: false, // not needed for this test
    flowType: 'pkce',
    detectSessionInUrl: false, // no URL in Node
  },
});

// ── Derive the expected storage key (matches supabase-js internal logic) ─────
let projectRef;
try {
  projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
} catch {
  console.error('FAIL — VITE_SUPABASE_URL is not a valid URL:', SUPABASE_URL);
  process.exit(1);
}
const VERIFIER_KEY = `sb-${projectRef}-auth-token-code-verifier`;

// ── Run ───────────────────────────────────────────────────────────────────────
async function run() {
  const testEmail = `lb4-test-${Date.now()}@example-lb4.invalid`;
  const testPassword = 'LB4testPassword!99';

  console.log('LB#4 PKCE code_verifier persistence test');
  console.log('  Project ref :', projectRef);
  console.log('  Storage key :', VERIFIER_KEY);
  console.log('  Test email  :', testEmail);
  console.log('');

  // Sign out first (mirrors the LB#4 fix in CreatorAuth.tsx)
  await supabase.auth.signOut();

  // Attempt signUp — with flowType:'pkce' the client should write the
  // code_verifier to storageAdapter BEFORE making the network request.
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      emailRedirectTo: 'https://creator-dm-hub.vercel.app/auth/callback?intent=creator',
    },
  });

  if (error) {
    // signUp errors are expected for throwaway emails — the verifier should
    // still have been written before the request was attempted. Check storage
    // regardless.
    console.warn('  signUp returned an error (expected for test email):', error.message);
  }

  // Check storage
  const storedRaw = storageAdapter.getItem(VERIFIER_KEY);

  if (!storedRaw) {
    console.error('FAIL — code_verifier key is missing from storage after signUp.');
    console.error(
      '       The PKCE verifier was not written. Check flowType and storage config in client.ts.'
    );
    process.exit(1);
  }

  let verifier;
  try {
    // auth-js stores it as JSON.stringify(string)
    verifier = JSON.parse(storedRaw);
  } catch {
    verifier = storedRaw;
  }

  // Strip the optional /PASSWORD_RECOVERY suffix before showing prefix
  const verifierValue = typeof verifier === 'string' ? verifier.split('/')[0] : String(verifier);

  if (!verifierValue || verifierValue.length < 20) {
    console.error('FAIL — code_verifier found but appears empty or too short:', verifierValue);
    process.exit(1);
  }

  console.log(`PASS — code_verifier present and non-empty.`);
  console.log(`       Prefix: ${verifierValue.slice(0, 8)}… (${verifierValue.length} chars)`);
  console.log('');
  console.log('Verification criteria met:');
  console.log('  ✓ supabase.auth.signUp() with flowType:pkce wrote code_verifier to storage');
  console.log('  ✓ Key:', VERIFIER_KEY);
  console.log('  ✓ Value is non-empty (first 8 chars logged above)');
}

run().catch((err) => {
  console.error('FAIL — unexpected error:', err);
  process.exit(1);
});
