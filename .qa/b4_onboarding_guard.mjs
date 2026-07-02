/**
 * B4 — ONBOARDING-3 verification
 *
 * Verifies commit eb6f5f4's B4 fix: an approved creator with no
 * creator_settings row must be redirected to /creator-onboarding when they
 * land on /dashboard, instead of being shown the dashboard.
 *
 * Strategy
 * ────────
 * 1. If SUPABASE_SERVICE_ROLE_KEY is set:
 *    → Create a fresh confirmed creator account (michellebieriuae+b4test@inboxbear.com)
 *      via the Supabase auth admin API (bypasses PKCE / email flow entirely).
 * 2. Otherwise:
 *    → Reuse the already-approved QA creator from .qa/regression_state.json.
 *      That account went through the full approval pipeline in a prior test run.
 *
 * In both cases the script:
 *   a) Ensures no creator_settings row exists for the test user (deletes if found).
 *   b) Opens Playwright, signs in as the creator at /creator-auth (Sign In tab).
 *   c) Waits for navigation and asserts final URL is /creator-onboarding.
 *   d) Restores the creator_settings row (if it was deleted) so the account
 *      is not permanently broken.
 *
 * Required env vars
 * ─────────────────
 *   ADMIN_PASSWORD  — Michelle's admin account password (used to get admin JWT).
 *                     Same var as approval_pipeline_e2e.mjs.
 * Optional:
 *   SUPABASE_SERVICE_ROLE_KEY  — enables fresh-account creation path.
 *   ADMIN_EMAIL                — defaults to michelle@gmx.ch.
 *
 * Run:
 *   ADMIN_PASSWORD=xxx node .qa/b4_onboarding_guard.mjs
 *   ADMIN_PASSWORD=xxx SUPABASE_SERVICE_ROLE_KEY=yyy node .qa/b4_onboarding_guard.mjs
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';

// ── Config ────────────────────────────────────────────────────────────────────
const PROD = 'https://creator-dm-hub.vercel.app';

const envRaw = readFileSync('/Users/michellebieri/Desktop/Coding/dmme/.env', 'utf8');
const SUPA_URL = envRaw.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const ANON_KEY = envRaw.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'michelle@gmx.ch';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error('FAIL — ADMIN_PASSWORD env var is required. Aborting.');
  process.exit(2);
}

// Fixed test account (used when service role key is available)
const B4_TEST = {
  email: 'michellebieriuae+b4test@inboxbear.com',
  password: 'B4Test!2026',
  username: 'b4testcreator',
  display_name: 'B4 Test Creator',
};

// Fall-back: already-approved QA creator from prior pipeline run
const STATE = JSON.parse(
  readFileSync('/Users/michellebieri/Desktop/Coding/dmme/.qa/regression_state.json', 'utf8')
);
const QA_CREATOR = STATE.CREATOR; // { email, password, username, display_name }

const log = (...a) => console.log(...a);
const pass = (name, evidence) => { log(`\n✓ PASS — ${name}`); if (evidence) log('  ', JSON.stringify(evidence, null, 2).slice(0, 600)); };
const fail = (name, reason) => { log(`\n✗ FAIL — ${name}`); log('  ', reason); };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** REST helper — always returns { ok, status, body } */
async function rest(path, { method = 'GET', jwt, body } = {}) {
  const headers = { 'Content-Type': 'application/json', apikey: ANON_KEY };
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  if (SERVICE_ROLE_KEY && path.startsWith('/auth/v1/admin')) {
    headers['Authorization'] = `Bearer ${SERVICE_ROLE_KEY}`;
    headers['apikey'] = SERVICE_ROLE_KEY;
  }
  const res = await fetch(`${SUPA_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let text = '';
  try { text = await res.text(); } catch {}
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, body: json ?? text };
}

/** Sign in via REST and return access_token. */
async function signInViaRest(email, password) {
  const r = await rest('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  });
  if (!r.ok) throw new Error(`signIn failed: ${JSON.stringify(r.body)}`);
  return r.body.access_token;
}

/** Look up a profile row by username. Returns { id, role } or null. */
async function lookupProfile(username, jwt) {
  const r = await rest(`/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=id,role`, { jwt });
  if (!r.ok || !Array.isArray(r.body) || r.body.length === 0) return null;
  return r.body[0];
}

/** Check if a creator_settings row exists for user_id. Returns the row or null. */
async function getCreatorSettings(userId, jwt) {
  const r = await rest(`/rest/v1/creator_settings?user_id=eq.${userId}&select=*`, { jwt });
  if (!r.ok || !Array.isArray(r.body) || r.body.length === 0) return null;
  return r.body[0];
}

/** Delete creator_settings row(s) for user_id. */
async function deleteCreatorSettings(userId, jwt) {
  const r = await rest(`/rest/v1/creator_settings?user_id=eq.${userId}`, {
    method: 'DELETE',
    jwt,
  });
  return r;
}

/** Re-insert a previously deleted creator_settings row. */
async function restoreCreatorSettings(row, jwt) {
  const r = await rest('/rest/v1/creator_settings', {
    method: 'POST',
    jwt,
    body: row,
  });
  return r;
}

/** Call admin_approve_creator_application RPC using admin JWT. */
async function approveApplication(applicationId, adminJwt) {
  const r = await rest('/rest/v1/rpc/admin_approve_creator_application', {
    method: 'POST',
    jwt: adminJwt,
    body: { p_application_id: applicationId },
  });
  return r;
}

/** Get the latest creator_verifications row for a user_id. */
async function getApplication(userId, adminJwt) {
  const r = await rest(
    `/rest/v1/creator_verifications?creator_id=eq.${userId}&order=submitted_at.desc&limit=1`,
    { jwt: adminJwt }
  );
  if (!r.ok || !Array.isArray(r.body) || r.body.length === 0) return null;
  return r.body[0];
}

// ── Main ──────────────────────────────────────────────────────────────────────
log('B4 — ONBOARDING-3 verification');
log('='.repeat(50));

let result = 'FAIL';
let actualUrl = '(not captured)';
let savedSettings = null; // for cleanup
let testUserId = null;    // for cleanup

const browser = await chromium.launch({ headless: true });

try {
  // ── Step 1: Determine test creator account ──────────────────────────────────
  log('\n[1/6] Resolving test creator account…');

  let testCreator = null;

  if (SERVICE_ROLE_KEY) {
    log('  Service role key present — using fresh +b4test account.');
    // Create or retrieve the fixed B4 test user via admin API.
    // Try to delete first (idempotent re-runs).
    const existsCheck = await rest('/auth/v1/admin/users', {
      method: 'GET',
    });
    // List users is not filterable easily; just attempt create and swallow duplicate error.
    const createRes = await rest('/auth/v1/admin/users', {
      method: 'POST',
      body: {
        email: B4_TEST.email,
        password: B4_TEST.password,
        email_confirm: true,   // bypass email confirmation
        user_metadata: { username: B4_TEST.username, display_name: B4_TEST.display_name, role: 'customer' },
      },
    });
    if (createRes.ok) {
      testUserId = createRes.body.id;
      log(`  Created auth user: ${testUserId}`);
    } else if (createRes.body?.error_code === 'email_exists' || createRes.body?.message?.includes('already been registered') || createRes.body?.msg?.includes('already been registered')) {
      // User exists — look up via admin API (avoids needing a confirmed session)
      const listRes = await rest(`/auth/v1/admin/users?email=${encodeURIComponent(B4_TEST.email)}`, { method: 'GET' });
      const found = listRes.body?.users?.[0];
      if (found) {
        testUserId = found.id;
        log(`  User already exists: ${testUserId}`);
      } else {
        // Fallback: delete and recreate
        log('  Could not find existing user via admin list — will recreate.');
        throw new Error('Cannot locate existing +b4test user. Delete it from Supabase Auth and re-run.');
      }
    } else {
      throw new Error(`Admin user create failed: ${JSON.stringify(createRes.body)}`);
    }
    testCreator = B4_TEST;
  } else {
    log('  No SUPABASE_SERVICE_ROLE_KEY — reusing existing QA creator from regression_state.json.');
    log(`  QA Creator: ${QA_CREATOR.email}`);
    testCreator = QA_CREATOR;
  }

  pass('1 — Test creator account resolved', { email: testCreator.email });

  // ── Step 2: Get admin JWT ───────────────────────────────────────────────────
  log('\n[2/6] Signing in as admin to get JWT…');
  const adminJwt = await signInViaRest(ADMIN_EMAIL, ADMIN_PASSWORD);
  log('  Admin JWT obtained.');
  pass('2 — Admin sign-in');

  // ── Step 3: Resolve test user's profile ID ─────────────────────────────────
  log('\n[3/6] Looking up profile for test creator…');
  let profile = await lookupProfile(testCreator.username, adminJwt);

  if (!profile) {
    // Profile may not exist if it's a brand-new service-role-created account.
    // Insert a minimal profile row so lookupProfile works.
    if (SERVICE_ROLE_KEY && testUserId) {
      const insRes = await rest('/rest/v1/profiles', {
        method: 'POST',
        jwt: adminJwt,
        body: {
          id: testUserId,
          username: testCreator.username,
          display_name: testCreator.display_name,
          role: 'customer',
        },
      });
      if (!insRes.ok) throw new Error(`Profile insert failed: ${JSON.stringify(insRes.body)}`);
      profile = { id: testUserId, role: 'customer' };
      log(`  Inserted profile row for new user.`);
    } else {
      throw new Error(`Profile not found for username=${testCreator.username}. Has the account been through the approval pipeline?`);
    }
  }

  testUserId = profile.id;
  log(`  Profile ID: ${testUserId}  role: ${profile.role}`);
  pass('3 — Profile resolved', { id: testUserId, role: profile.role });

  // ── Step 4: Ensure creator role exists (approve if needed) ─────────────────
  log('\n[4/6] Ensuring creator role is assigned…');

  if (profile.role !== 'creator') {
    log('  Role is not creator — need to approve. Looking for creator_verifications row…');
    const app = await getApplication(testUserId, adminJwt);

    if (!app) {
      if (SERVICE_ROLE_KEY) {
        // Insert a stub creator_verifications row so we can approve it.
        const insApp = await rest('/rest/v1/creator_verifications', {
          method: 'POST',
          jwt: adminJwt,
          body: {
            creator_id: testUserId,
            status: 'pending',
          },
        });
        if (!insApp.ok) throw new Error(`creator_verifications insert failed: ${JSON.stringify(insApp.body)}`);
        log('  Inserted stub creator_verifications row.');
        const app2 = await getApplication(testUserId, adminJwt);
        if (!app2) throw new Error('Still no creator_verifications row after insert.');
        const approvalRes = await approveApplication(app2.id, adminJwt);
        if (!approvalRes.ok) throw new Error(`Approval RPC failed: ${JSON.stringify(approvalRes.body)}`);
        const approvalResult = approvalRes.body;
        if (approvalResult?.success === false) throw new Error(`Approval returned success:false — ${approvalResult.error}`);
        log(`  Approval RPC response: ${JSON.stringify(approvalResult)}`);
      } else {
        throw new Error(
          'No creator_verifications row for QA creator and no service role key to create one. ' +
          'Ensure the approval pipeline has been run at least once for this account.'
        );
      }
    } else {
      if (app.status !== 'approved') {
        log(`  Application ID ${app.id} status=${app.status} — calling approval RPC…`);
        const approvalRes = await approveApplication(app.id, adminJwt);
        if (!approvalRes.ok) throw new Error(`Approval RPC failed: ${JSON.stringify(approvalRes.body)}`);
        const approvalResult = approvalRes.body;
        if (approvalResult?.success === false) throw new Error(`Approval returned success:false — ${approvalResult.error}`);
        log(`  Approval RPC response: ${JSON.stringify(approvalResult)}`);
      } else {
        log(`  Application already approved — skipping RPC.`);
      }
    }
    pass('4 — Creator role assigned via admin_approve_creator_application RPC');
  } else {
    log('  Already a creator — skipping approval.');
    pass('4 — Creator role already assigned');
  }

  // ── Step 5: Delete creator_settings row (guarantee "no settings" state) ─────
  log('\n[5/6] Checking and clearing creator_settings row…');
  savedSettings = await getCreatorSettings(testUserId, adminJwt);

  if (savedSettings) {
    log(`  Found creator_settings row (id=${savedSettings.id}) — deleting for test…`);
    const delRes = await deleteCreatorSettings(testUserId, adminJwt);
    if (!delRes.ok) throw new Error(`Delete creator_settings failed: status=${delRes.status} ${JSON.stringify(delRes.body)}`);
    log('  Deleted.');
    // Verify deletion
    const confirmDel = await getCreatorSettings(testUserId, adminJwt);
    if (confirmDel) throw new Error('creator_settings row still present after DELETE — cannot proceed.');
    log('  Deletion confirmed.');
    pass('5 — creator_settings row deleted (will restore after test)', { deleted_id: savedSettings.id });
  } else {
    log('  No creator_settings row exists — ideal test state already in place.');
    pass('5 — No creator_settings row (no cleanup needed)');
  }

  // ── Step 6: Playwright — sign in as creator, assert redirect ────────────────
  log('\n[6/6] Playwright: signing in as creator at /creator-auth, asserting redirect…');

  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const httpErrors = [];
  page.on('response', async r => {
    if (r.status() >= 400) {
      const host = new URL(r.url()).hostname;
      if (host.includes('supabase') || host.includes('vercel')) {
        let b = ''; try { b = (await r.text()).slice(0, 200); } catch {}
        httpErrors.push(`${r.status()} ${r.url().slice(0, 80)} :: ${b}`);
      }
    }
  });

  // Clear any stale auth state
  await page.goto(PROD, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  log('  localStorage cleared.');

  // Navigate to /creator-auth
  await page.goto(`${PROD}/creator-auth`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/B4_01_creator_auth.png' });

  // Switch to Sign In tab if needed
  const signInTab = page.getByRole('tab', { name: /sign in/i }).first();
  if (await signInTab.count() > 0) {
    await signInTab.click();
    await page.waitForTimeout(500);
  }

  // Fill credentials
  const emailInput = page.locator('input[type=email]').first();
  const passwordInput = page.locator('input[type=password]').first();
  await emailInput.fill(testCreator.email);
  await passwordInput.fill(testCreator.password);
  await page.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/B4_02_credentials_filled.png' });

  // Submit
  const submitBtn = page.locator('button[type=submit]').first();
  await submitBtn.click();

  // Wait for navigation — allow up to 10 s for the creator_settings check + redirect
  await page.waitForTimeout(6000);
  await page.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/B4_03_after_login.png' });

  actualUrl = page.url();
  log(`  Final URL: ${actualUrl}`);

  const pathname = new URL(actualUrl).pathname;

  if (pathname === '/creator-onboarding') {
    result = 'PASS';
    pass('6 — Redirect to /creator-onboarding confirmed', {
      actualUrl,
      httpErrors: httpErrors.slice(0, 5),
    });
  } else {
    fail(
      '6 — Wrong redirect destination',
      `Expected /creator-onboarding but got ${pathname}. Full URL: ${actualUrl}`
    );
    const bodyText = (await page.textContent('body')).replace(/\s+/g, ' ').slice(0, 500);
    log('  Page body snippet:', bodyText);
  }

  await ctx.close();

} catch (err) {
  fail('Uncaught error', err.message);
  log(err.stack);
} finally {
  // ── Cleanup: restore creator_settings row if we deleted it ─────────────────
  if (savedSettings && testUserId) {
    log('\n[Cleanup] Restoring creator_settings row…');
    try {
      const adminJwt2 = await signInViaRest(ADMIN_EMAIL, ADMIN_PASSWORD);
      const restoreRes = await restoreCreatorSettings(savedSettings, adminJwt2);
      if (restoreRes.ok) {
        log('  creator_settings row restored.');
      } else {
        log(`  WARNING — could not restore creator_settings: ${JSON.stringify(restoreRes.body)}`);
      }
    } catch (e) {
      log('  WARNING — cleanup signIn failed:', e.message);
    }
  }

  await browser.close();
}

// ── Final verdict ─────────────────────────────────────────────────────────────
log('\n' + '═'.repeat(50));
log(`B4 ONBOARDING-3 result: ${result}`);
log(`Actual redirect URL:    ${actualUrl}`);
log('Screenshots: .qa/screens/B4_01_* B4_02_* B4_03_*');
log('═'.repeat(50));

process.exit(result === 'PASS' ? 0 : 1);
