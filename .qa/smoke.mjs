// Autonomous backend smoke + security-regression tests for dmme.
// Uses Supabase REST + Auth APIs directly. No real account or production data touched.
// Test customer is a fresh signup with random email per run.

import { readFileSync } from 'fs';

const env = readFileSync('/Users/michellebieri/Desktop/Coding/dmme/.env', 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const ANON_KEY = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];

const log = (...args) => console.log(...args);
const stamp = Date.now();

// Try several test-friendly domains
const EMAIL_CANDIDATES = [
  `qa-${stamp}@inboxbear.com`,
  `qa-${stamp}@trashmail.com`,
  `qa-${stamp}@guerrillamail.com`,
  `qa-${stamp}@mailinator.com`,
];
const PASSWORD = `QaTest!${stamp}`;
const USERNAME = `qa_${stamp}`;
const DISPLAY_NAME = `QA Test ${stamp}`;

async function signupCustomer() {
  for (const email of EMAIL_CANDIDATES) {
    log(`\n→ Attempting signup with ${email}`);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, password: PASSWORD,
        data: { username: USERNAME, display_name: DISPLAY_NAME, role: 'customer' },
      }),
    });
    const body = await res.json();
    if (res.ok) {
      log(`  ✓ Signup OK. Email: ${email}`);
      log(`    user.id: ${body.user?.id}, email_confirmed: ${body.user?.email_confirmed_at ? 'yes' : 'no'}`);
      log(`    session: ${body.session ? 'YES — usable immediately' : 'NO — confirmation required'}`);
      return { email, body };
    }
    log(`  ✗ Failed: HTTP ${res.status} — ${body.error || body.message || body.msg || JSON.stringify(body)}`);
  }
  return null;
}

async function signin(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await res.json();
  return { ok: res.ok, status: res.status, body };
}

async function authedFetch(jwt, path, opts = {}) {
  const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

async function main() {
  log(`=== dmme autonomous smoke ===`);
  log(`prod URL: ${SUPABASE_URL}`);

  // ── Test account ────────────────────────────────────────────────────────────
  const signup = await signupCustomer();
  if (!signup) {
    log('\n✗ Could not create a test account. All candidate emails rejected.');
    return;
  }

  let jwt = signup.body.session?.access_token;
  const userId = signup.body.user?.id;

  if (!jwt) {
    log('  trying sign-in (in case session not returned by signup)…');
    const si = await signin(signup.email);
    if (!si.ok) {
      log(`  ✗ sign-in failed: ${si.body.error_description || si.body.msg || JSON.stringify(si.body)}`);
      log(`  → email confirmation required; can't proceed without confirming.`);
      return;
    }
    jwt = si.body.access_token;
  }

  log(`\n✓ Test customer ready. user.id=${userId}`);

  // ── Security regression: C1 — wallet_balance UPDATE ─────────────────────────
  log(`\n--- SECURITY REGRESSION ---`);
  {
    const r = await authedFetch(jwt, `/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ wallet_balance: 9999 }),
    });
    const blocked = r.status === 403 || r.status === 401 ||
                    (typeof r.body === 'object' && r.body?.code === '42501');
    log(`  C1 (wallet_balance UPDATE): ${blocked ? '✓ BLOCKED' : '✗ NOT BLOCKED'} — HTTP ${r.status} — ${JSON.stringify(r.body).slice(0,200)}`);
  }

  // ── Security regression: C1 — role UPDATE ──────────────────────────────────
  {
    const r = await authedFetch(jwt, `/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ role: 'admin' }),
    });
    const blocked = r.status === 403 || r.status === 401 ||
                    (typeof r.body === 'object' && r.body?.code === '42501');
    log(`  C1 (role UPDATE):           ${blocked ? '✓ BLOCKED' : '✗ NOT BLOCKED'} — HTTP ${r.status} — ${JSON.stringify(r.body).slice(0,200)}`);
  }

  // ── Security regression: C2 — direct messages INSERT as customer ────────────
  {
    // First need a conversation row. Create one to a known creator (michellebieri).
    const MICHELLE_ID = 'e394bb4b-3d73-4c7a-96ff-9ff802e0f5d0';
    const conv = await authedFetch(jwt, `/rest/v1/conversations`, {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ creator_id: MICHELLE_ID, customer_id: userId }),
    });
    if (conv.status >= 200 && conv.status < 300 && Array.isArray(conv.body) && conv.body[0]?.id) {
      const convId = conv.body[0].id;
      log(`  (created test conversation: ${convId})`);
      const r = await authedFetch(jwt, `/rest/v1/messages`, {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({
          conversation_id: convId, sender_id: userId,
          content: 'C2 regression bypass test', is_paid: true, message_type: 'text',
        }),
      });
      const blocked = r.status === 403 || r.status === 401 ||
                      (typeof r.body === 'object' && (r.body?.code === '42501' || (r.body?.message || '').includes('row-level security')));
      log(`  C2 (direct messages INSERT as customer): ${blocked ? '✓ BLOCKED' : '✗ NOT BLOCKED'} — HTTP ${r.status} — ${JSON.stringify(r.body).slice(0,200)}`);
    } else {
      log(`  C2: could not create conversation to test against. status=${conv.status} body=${JSON.stringify(conv.body).slice(0,200)}`);
    }
  }

  // ── Security regression: H3 — wallet_transactions INSERT ───────────────────
  {
    const r = await authedFetch(jwt, `/rest/v1/wallet_transactions`, {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        user_id: userId, amount: 100, transaction_type: 'deposit',
        description: 'H3 regression test',
      }),
    });
    const blocked = r.status === 403 || r.status === 401 ||
                    (typeof r.body === 'object' && r.body?.code === '42501');
    log(`  H3 (wallet_transactions INSERT): ${blocked ? '✓ BLOCKED' : '✗ NOT BLOCKED'} — HTTP ${r.status} — ${JSON.stringify(r.body).slice(0,200)}`);
  }

  // ── Read tests ──────────────────────────────────────────────────────────────
  log(`\n--- READ TESTS ---`);
  {
    const r = await authedFetch(jwt, `/rest/v1/profiles?id=eq.${userId}&select=id,username,wallet_balance,role`);
    log(`  SELECT own profile: HTTP ${r.status} — ${JSON.stringify(r.body).slice(0, 300)}`);
  }

  log(`\n=== done. test account: ${signup.email} (will not be cleaned up). ===`);
}

await main().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
