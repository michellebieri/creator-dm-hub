// HUMAN-SIMULATION UI smoke tests via Playwright (revised).
// Drives the real prod app, captures screenshots + console + network on every flow.

import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';

const PROD = 'https://creator-dm-hub.vercel.app';
const SCREEN_DIR = '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens';
if (!existsSync(SCREEN_DIR)) mkdirSync(SCREEN_DIR, { recursive: true });

const stamp = Date.now();
const TEST_CUSTOMER = {
  email: `qa-cust-${stamp}@inboxbear.com`,
  password: `QaTest!${stamp}`,
  username: `qacust${stamp}`.slice(0, 24),
  display_name: `QA Cust ${stamp}`,
};

const log = (...a) => console.log(...a);
const flows = [];
const track = async (name, fn) => {
  log(`\n--- ${name} ---`);
  try {
    const evidence = await fn();
    flows.push({ name, status: 'PASS', evidence });
    log(`  ✓ PASS`);
  } catch (e) {
    flows.push({ name, status: 'FAIL', error: e.message });
    log(`  ✗ FAIL: ${e.message}`);
  }
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const events = { console: [], pageerror: [], httpErrors: [] };
const resetEvents = () => { for (const k of Object.keys(events)) events[k].length = 0; };
page.on('console', m => { if (m.type() === 'error') events.console.push(m.text()); });
page.on('pageerror', e => events.pageerror.push(e.message));
page.on('response', async (r) => {
  if (r.status() >= 400) {
    let body = '';
    try { body = (await r.text()).slice(0, 400); } catch {}
    events.httpErrors.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}${new URL(r.url()).search.slice(0,80)} :: ${body}`);
  }
});

const shoot = async (name) => {
  await page.screenshot({ path: `${SCREEN_DIR}/${name}.png`, fullPage: false });
};

const evDump = () => ({
  console: events.console.slice(0, 5),
  pageerror: events.pageerror.slice(0, 3),
  httpErrors: events.httpErrors.slice(0, 5),
});

// ─────────────────────────────────────────────────────────────────────────────
await track('FLOW 0 — Landing page (anon)', async () => {
  resetEvents();
  await page.goto(`${PROD}/`, { waitUntil: 'networkidle' });
  await shoot('00_landing');
  return { title: await page.title(), events: evDump() };
});

// ─────────────────────────────────────────────────────────────────────────────
await track("FLOW 1 — Michelle's public profile (anon visitor)", async () => {
  resetEvents();
  await page.goto(`${PROD}/Michellebieri`, { waitUntil: 'networkidle' });
  await shoot('01_michelle_profile_anon');
  const body = (await page.textContent('body')).replace(/\s+/g, ' ');
  const notFound = /creator not found|could not find/i.test(body);
  if (notFound) {
    throw new Error(`Profile page shows "Creator not found" to anon visitors. Snippet: "${body.slice(0, 300)}"`);
  }
  return { visibleSnippet: body.slice(0, 250), events: evDump() };
});

// ─────────────────────────────────────────────────────────────────────────────
// Some platforms call this username case-sensitive. Try lowercase variant.
await track("FLOW 1b — Michelle's public profile lowercase /@michellebieri", async () => {
  resetEvents();
  await page.goto(`${PROD}/michellebieri`, { waitUntil: 'networkidle' });
  await shoot('01b_michelle_profile_anon_lower');
  const body = (await page.textContent('body')).replace(/\s+/g, ' ');
  const notFound = /creator not found|could not find/i.test(body);
  if (notFound) throw new Error(`also Creator not found at lowercase URL. Snippet: "${body.slice(0,300)}"`);
  return { visibleSnippet: body.slice(0, 250), events: evDump() };
});

// ─────────────────────────────────────────────────────────────────────────────
await track('FLOW 2 — Customer signup via UI (uses Tabs)', async () => {
  resetEvents();
  await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
  await shoot('02a_auth_default_signin');

  // Click the Radix Tabs trigger for Sign Up
  const signupTab = page.getByRole('tab', { name: /sign ?up/i });
  if (await signupTab.count() === 0) throw new Error('no "Sign Up" tab found');
  await signupTab.click();
  await page.waitForTimeout(500);
  await shoot('02b_auth_signup_tab');

  // Fill the form
  const usernameInput = page.locator('input[id*=username i], input[placeholder*=username i]').first();
  if (await usernameInput.count() > 0) await usernameInput.fill(TEST_CUSTOMER.username);
  const displayInput = page.locator('input[id*=display i], input[placeholder*=display i], input[placeholder*=name i]:not([type=email])').first();
  if (await displayInput.count() > 0) await displayInput.fill(TEST_CUSTOMER.display_name);
  await page.locator('input[type=email]').first().fill(TEST_CUSTOMER.email);
  await page.locator('input[type=password]').first().fill(TEST_CUSTOMER.password);
  await shoot('02c_signup_filled');

  const submit = page.locator('button[type=submit]').first();
  if (await submit.count() === 0) throw new Error('no submit button on signup form');
  await submit.click();
  await page.waitForTimeout(3500);
  await shoot('02d_signup_after');

  const body = (await page.textContent('body')).replace(/\s+/g, ' ');
  const url = page.url();
  const successToast = /account created|welcome|check.*email|confirm.*email|verification/i.exec(body);
  const errorToast = /sign ?up failed|already|invalid|error/i.exec(body);
  return {
    finalUrl: url,
    successSignal: successToast?.[0] || null,
    errorSignal: errorToast?.[0] || null,
    bodySnippet: body.slice(0, 300),
    events: evDump(),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
await track('FLOW 3 — Customer login attempt with the freshly signed-up creds', async () => {
  resetEvents();
  await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
  // signin tab is default
  await page.locator('input[type=email]').first().fill(TEST_CUSTOMER.email);
  await page.locator('input[type=password]').first().fill(TEST_CUSTOMER.password);
  await shoot('03a_login_filled');
  await page.locator('button[type=submit]').first().click();
  await page.waitForTimeout(3000);
  await shoot('03b_login_after');
  const url = page.url();
  const body = (await page.textContent('body')).replace(/\s+/g, ' ');
  const stillOnAuth = url.includes('/auth');
  const errorSignal = /email not confirmed|invalid login credentials|incorrect|invalid/i.exec(body);
  if (stillOnAuth) {
    throw new Error(`Login did not advance off /auth. Signal: ${errorSignal?.[0] || 'no error toast — UI silently stayed put'}`);
  }
  return { url, bodySnippet: body.slice(0, 200), events: evDump() };
});

// ─────────────────────────────────────────────────────────────────────────────
// Try to inspect the auth-page redirect destination if logged in
// (will not run if previous flow failed)
const loggedIn = !page.url().includes('/auth');
if (loggedIn) {
  await track('FLOW 4 — Customer landed on dashboard after login', async () => {
    resetEvents();
    const url = page.url();
    await shoot('04_post_login');
    return { url, events: evDump() };
  });

  await track('FLOW 5 — Logged-in customer visits michelle profile', async () => {
    resetEvents();
    await page.goto(`${PROD}/Michellebieri`, { waitUntil: 'networkidle' });
    await shoot('05_michelle_logged_in');
    const body = (await page.textContent('body')).replace(/\s+/g, ' ');
    const notFound = /creator not found|could not find/i.test(body);
    if (notFound) throw new Error(`even logged-in, profile shows Creator not found`);
    return { body: body.slice(0, 250), events: evDump() };
  });
}

await browser.close();

// ─────────────────────────────────────────────────────────────────────────────
log(`\n\n═══ SUMMARY ═══`);
for (const f of flows) {
  log(`\n[${f.status}] ${f.name}`);
  if (f.evidence) log(`  evidence: ${JSON.stringify(f.evidence, null, 2).slice(0, 800)}`);
  if (f.error) log(`  error: ${f.error}`);
}
const fails = flows.filter(f => f.status === 'FAIL');
log(`\n${flows.length - fails.length}/${flows.length} passed | screenshots in ${SCREEN_DIR}`);
writeFileSync(`${SCREEN_DIR}/_results.json`, JSON.stringify(flows, null, 2));
process.exit(fails.length ? 1 : 0);
