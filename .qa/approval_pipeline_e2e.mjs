// LB#1 verification — full creator approval pipeline E2E.
// A brand-new creator account submits an application; an admin sees + approves
// it; the new creator's role flips to 'creator' end-to-end. No DB hand-edits.
//
// Email confirmation is currently OFF (per QA report). When LB#2 is fixed and
// the toggle goes back on, this script will need an inbox harness — left as
// a follow-up.

import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const PROD = 'https://creator-dm-hub.vercel.app';
const env = readFileSync('/Users/michellebieri/Desktop/Coding/dmme/.env', 'utf8');
const SUPA_URL = env.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const ANON = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];

// Admin credentials read from state file — same Michelle account.
const STATE = JSON.parse(readFileSync('/Users/michellebieri/Desktop/Coding/dmme/.qa/regression_state.json', 'utf8'));
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'michelle@gmx.ch';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error('Set ADMIN_PASSWORD env var (Michelle\'s admin password). Aborting.');
  process.exit(2);
}

const stamp = Date.now();
const short = stamp.toString().slice(-9);
const NEW_CREATOR = {
  email: `qa-fresh-creator-${stamp}@inboxbear.com`,
  password: `QaTest!${stamp}`,
  username: `qac${short}`.slice(0, 20),
  display_name: `QA Fresh Creator ${stamp}`,
};

const log = (...a) => console.log(...a);
const flows = [];
const T = async (name, fn) => {
  log(`\n--- ${name} ---`);
  try {
    const e = await fn();
    flows.push({ name, status: 'PASS', evidence: e });
    log(`  ✓ PASS`);
  } catch (err) {
    flows.push({ name, status: 'FAIL', error: err.message });
    log(`  ✗ FAIL: ${err.message}`);
  }
};

const browser = await chromium.launch();
const creatorCtx = await browser.newContext();
const creatorPage = await creatorCtx.newPage();
const adminCtx = await browser.newContext();
const adminPage = await adminCtx.newPage();

const errors = { creator: [], admin: [] };
const attach = (page, key) => {
  page.on('response', async r => {
    if (r.status() >= 400 && new URL(r.url()).hostname.includes('supabase')) {
      let b = ''; try { b = (await r.text()).slice(0, 250); } catch {}
      errors[key].push(`${r.status()} ${new URL(r.url()).pathname.slice(0, 60)} :: ${b.slice(0, 150)}`);
    }
  });
};
attach(creatorPage, 'creator');
attach(adminPage, 'admin');

// ── P1: Brand-new creator signs up via /creator-auth + submits application ──
await T('P1 — fresh creator signs up via Creator Apply form', async () => {
  await creatorPage.goto(`${PROD}/creator-auth`, { waitUntil: 'networkidle' });
  await creatorPage.waitForTimeout(1000);

  // Switch to Apply tab
  await creatorPage.getByRole('tab', { name: /apply/i }).click();
  await creatorPage.waitForTimeout(500);

  // Step 1: account fields
  await creatorPage.locator('input[id*=username i], input[placeholder*=username i]').first().fill(NEW_CREATOR.username);
  await creatorPage.locator('input[id*=display i], input[placeholder*=display i]').first().fill(NEW_CREATOR.display_name);
  await creatorPage.locator('input[type=email]').first().fill(NEW_CREATOR.email);
  await creatorPage.locator('input[type=password]').first().fill(NEW_CREATOR.password);

  // Continue to step 2
  const nextBtn = creatorPage.getByRole('button', { name: /continue|next|step 2/i }).first();
  if (await nextBtn.count() > 0) await nextBtn.click();
  await creatorPage.waitForTimeout(1500);
  await creatorPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/PIPE_01_step2.png' });

  // Step 2: application fields
  await creatorPage.locator('input[id*=instagram i], input[placeholder*=instagram i]').first().fill('test_ig').catch(() => {});
  // Pick first option in any Select that's part of follower range / niche
  const aboutBox = creatorPage.locator('textarea').first();
  if (await aboutBox.count() > 0) await aboutBox.fill('Pipeline E2E — testing creator approval.');

  // Submit
  const submitBtn = creatorPage.getByRole('button', { name: /submit application|submit|apply/i }).last();
  await submitBtn.click();
  await creatorPage.waitForTimeout(4000);
  await creatorPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/PIPE_02_after_submit.png' });

  const body = (await creatorPage.textContent('body')).replace(/\s+/g, ' ');
  const successSign = /application submitted|under review|application received/i.test(body);
  if (!successSign) throw new Error(`No success screen after submit. Body: ${body.slice(0, 400)}`);
  return { httpErrors: errors.creator.slice(0, 3) };
});

// ── P2: Verify the verification row actually exists in DB (admin view) ──
await T('P2 — admin signs in', async () => {
  await adminPage.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
  await adminPage.locator('input[type=email]').first().fill(ADMIN_EMAIL);
  await adminPage.locator('input[type=password]').first().fill(ADMIN_PASSWORD);
  await adminPage.locator('button[type=submit]').first().click();
  await adminPage.waitForTimeout(3500);
  if (adminPage.url().includes('/auth')) throw new Error('admin login failed');
  return { url: adminPage.url() };
});

await T('P3 — admin sees fresh application in /admin Applications tab', async () => {
  errors.admin.length = 0;
  await adminPage.goto(`${PROD}/admin`, { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(3000);
  await adminPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/PIPE_03_admin_apps.png' });
  // Click Applications tab if not already active
  const appsTab = adminPage.getByRole('tab', { name: /applications/i }).first();
  if (await appsTab.count() > 0) {
    await appsTab.click();
    await adminPage.waitForTimeout(1500);
  }
  const body = (await adminPage.textContent('body')).replace(/\s+/g, ' ');
  const sees = body.includes(NEW_CREATOR.display_name) || body.includes(NEW_CREATOR.username);
  if (!sees) throw new Error(`Admin does NOT see fresh application. Body: ${body.slice(0, 500)}`);
  return { httpErrors: errors.admin.slice(0, 3) };
});

// ── P4: Admin approves ──
await T('P4 — admin approves the application', async () => {
  errors.admin.length = 0;
  // Find the Approve button on the row that contains our fresh creator's name.
  const card = adminPage.locator(`text=${NEW_CREATOR.display_name}`).first();
  if (await card.count() === 0) throw new Error('Card not found by display_name');
  const approveBtn = card.locator('xpath=ancestor::*[contains(@class,"Card") or self::div][1]//button[contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "approve")]').first();
  // Fallback: just any Approve button after clicking the relevant card
  if (await approveBtn.count() === 0) {
    const anyApprove = adminPage.getByRole('button', { name: /^approve$/i });
    if (await anyApprove.count() === 0) throw new Error('No Approve button found');
    await anyApprove.first().click();
  } else {
    await approveBtn.click();
  }
  await adminPage.waitForTimeout(3500);
  await adminPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/PIPE_04_after_approve.png' });
  const body = (await adminPage.textContent('body')).replace(/\s+/g, ' ');
  return { sawApprovedToast: /approved/i.test(body), httpErrors: errors.admin.slice(0, 3) };
});

// ── P5: Confirm creator role assigned via REST as anon (just read user_roles count) ──
await T('P5 — creator role assigned in user_roles + profiles.role updated', async () => {
  // Find the auth.users id by username (use the public.profiles view — admin can read all after migration)
  // We can't get auth.users.id from anon; use the admin's JWT to look up.
  const jwt = await adminPage.evaluate(() => {
    const raw = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))[0];
    return JSON.parse(localStorage.getItem(raw))?.access_token;
  });
  if (!jwt) throw new Error('no admin JWT in localStorage');

  // Look up the profile by username
  const profRes = await fetch(`${SUPA_URL}/rest/v1/profiles?username=eq.${NEW_CREATOR.username}&select=id,role`, {
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}` }
  });
  const profs = await profRes.json();
  if (!Array.isArray(profs) || profs.length === 0) throw new Error(`profile lookup empty: ${JSON.stringify(profs)}`);
  const profile = profs[0];

  const rolesRes = await fetch(`${SUPA_URL}/rest/v1/user_roles?user_id=eq.${profile.id}&select=role`, {
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}` }
  });
  const roles = await rolesRes.json();
  const isCreator = Array.isArray(roles) && roles.some(r => r.role === 'creator');

  if (!isCreator) throw new Error(`user_roles missing 'creator': ${JSON.stringify(roles)}`);
  if (profile.role !== 'creator') throw new Error(`profiles.role=${profile.role}, expected 'creator'`);

  return { profile_id: profile.id, profiles_role: profile.role, user_roles: roles };
});

// ── P6: Creator signs back in → should hit /dashboard or onboarding, NOT pending ──
await T('P6 — approved creator signs in and is NOT shown Application Under Review', async () => {
  // Sign creator out first
  await creatorPage.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
  // If already signed in, log out via top nav (or just clear storage)
  await creatorPage.evaluate(() => localStorage.clear());
  await creatorPage.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
  await creatorPage.locator('input[type=email]').first().fill(NEW_CREATOR.email);
  await creatorPage.locator('input[type=password]').first().fill(NEW_CREATOR.password);
  await creatorPage.locator('button[type=submit]').first().click();
  await creatorPage.waitForTimeout(4000);
  await creatorPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/PIPE_05_creator_postapprove.png' });
  const body = (await creatorPage.textContent('body')).replace(/\s+/g, ' ');
  const url = creatorPage.url();
  if (/application under review/i.test(body)) throw new Error('Still shows "Application Under Review" after approval');
  return { url, snippet: body.slice(0, 350), httpErrors: errors.creator.slice(0, 3) };
});

await browser.close();

log(`\n═══ SUMMARY ═══`);
for (const f of flows) {
  log(`\n[${f.status}] ${f.name}`);
  if (f.evidence) log(`  ${JSON.stringify(f.evidence, null, 2).slice(0, 600)}`);
  if (f.error) log(`  error: ${f.error}`);
}
const fails = flows.filter(f => f.status === 'FAIL').length;
log(`\n${flows.length - fails}/${flows.length} passed`);
process.exit(fails > 0 ? 1 : 0);
