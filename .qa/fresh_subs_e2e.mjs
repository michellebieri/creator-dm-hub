// Fresh-user subscription + unlock UI E2E.
// Uses the existing qa-fresh-* accounts (already through email-confirm + creator-approve gates).
// Exercises every step through the UI — NO direct DB writes, NO seed SQL beyond what
// was already loaded. Every "platform fix" must hold for these accounts the same way
// it would for a brand-new creator/customer created tomorrow.

import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

const PROD = 'https://creator-dm-hub.vercel.app';
const STATE = JSON.parse(readFileSync('/Users/michellebieri/Desktop/Coding/dmme/.qa/regression_state.json', 'utf8'));
const { CREATOR, CUSTOMER } = STATE;

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
const customerCtx = await browser.newContext();
const customerPage = await customerCtx.newPage();

const errors = { creator: [], customer: [] };
const attach = (page, key) => {
  page.on('response', async r => {
    if (r.status() >= 400 && new URL(r.url()).hostname.includes('supabase')) {
      let b = ''; try { b = (await r.text()).slice(0, 200); } catch {}
      errors[key].push(`${r.status()} ${new URL(r.url()).pathname.slice(0, 50)} :: ${b.slice(0, 150)}`);
    }
  });
};
attach(creatorPage, 'creator');
attach(customerPage, 'customer');
const evClear = () => { errors.creator.length = 0; errors.customer.length = 0; };

const login = async (page, user) => {
  await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').first().fill(user.email);
  await page.locator('input[type=password]').first().fill(user.password);
  await page.locator('button[type=submit]').first().click();
  await page.waitForTimeout(3000);
  if (page.url().includes('/auth')) throw new Error(`login failed for ${user.email}`);
};

await T('login both fresh accounts', async () => {
  await login(creatorPage, CREATOR);
  await login(customerPage, CUSTOMER);
  return { creator: creatorPage.url(), customer: customerPage.url() };
});

let creatorId, custId;
await T('read user IDs from localStorage', async () => {
  const getId = async (p) => p.evaluate(() => {
    const raw = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))[0];
    if (!raw) return null;
    try { return JSON.parse(localStorage.getItem(raw))?.user?.id; } catch { return null; }
  });
  creatorId = await getId(creatorPage);
  custId = await getId(customerPage);
  if (!creatorId || !custId) throw new Error(`creatorId=${creatorId} custId=${custId}`);
  return { creatorId, custId };
});

// ── Creator dashboard renders + shows nudge if no tiers ──
await T('creator dashboard: empty-state nudge + quick actions render', async () => {
  evClear();
  await creatorPage.goto(`${PROD}/creator-dashboard`, { waitUntil: 'networkidle' });
  await creatorPage.waitForTimeout(2000);
  await creatorPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/AUDIT_01_creator_dashboard.png' });
  const body = (await creatorPage.textContent('body')).replace(/\s+/g, ' ');
  const hasQuickActions =
    /Subscribers \(\d+\)/.test(body) &&
    /Subscription tiers/i.test(body) &&
    /Earnings/i.test(body);
  if (!hasQuickActions) throw new Error('Quick actions row missing on creator dashboard');
  return {
    hasNudge: /Set up subscription tiers to unlock recurring revenue/i.test(body),
    hasQuickActions,
    httpErrors: errors.creator.slice(0, 3),
  };
});

// ── Creator creates a tier via UI ──
const TIER_NAME = `Test Tier ${Date.now()}`;
await T('creator creates subscription tier via UI', async () => {
  evClear();
  await creatorPage.goto(`${PROD}/settings/subscription`, { waitUntil: 'networkidle' });
  await creatorPage.waitForTimeout(2000);
  await creatorPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/AUDIT_02_tier_settings.png' });

  // Click "Add Tier" (top right) or "Create Your First Tier" (empty state) — both open the same dialog
  const addBtn = creatorPage.getByRole('button', { name: /add tier|create your first tier/i }).first();
  if (await addBtn.count() === 0) throw new Error('Add Tier / Create First Tier button not found');
  await addBtn.click();
  await creatorPage.waitForTimeout(1000);

  // Fill name — placeholder is "e.g., Premium"
  await creatorPage.locator('input[placeholder*=Premium i]').first().fill(TIER_NAME);
  // Fill price — first number input
  await creatorPage.locator('input[type=number]').first().fill('9.99');

  // Save — button labeled "Create Tier"
  const saveBtn = creatorPage.getByRole('button', { name: /create tier|update tier/i }).first();
  if (await saveBtn.count() === 0) throw new Error('Create Tier button not found in dialog');
  await saveBtn.click();
  await creatorPage.waitForTimeout(3000);
  await creatorPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/AUDIT_03_after_tier_save.png' });

  const body = (await creatorPage.textContent('body')).replace(/\s+/g, ' ');
  const tierVisible = body.includes(TIER_NAME);
  return {
    tierVisibleAfterSave: tierVisible,
    httpErrors: errors.creator.slice(0, 3),
  };
});

// ── Customer sees the Subscribe button on creator profile ──
await T('customer sees Subscribe button on creator profile', async () => {
  evClear();
  await customerPage.goto(`${PROD}/${CREATOR.username}`, { waitUntil: 'networkidle' });
  await customerPage.waitForTimeout(2500);
  await customerPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/AUDIT_04_customer_profile_view.png' });
  // Use DOM role check, not text grep — text gets concatenated when whitespace stripped
  const subscribeBtnCount = await customerPage.getByRole('button', { name: /^Subscribe$/i }).count();
  if (subscribeBtnCount === 0) {
    const body = (await customerPage.textContent('body')).replace(/\s+/g, ' ');
    throw new Error(`Subscribe button not found by role. Body snippet: ${body.slice(0, 300)}`);
  }
  return {
    subscribeButtonInDom: subscribeBtnCount,
    httpErrors: errors.customer.slice(0, 3),
  };
});

await browser.close();

log(`\n═══ SUMMARY ═══`);
for (const f of flows) {
  log(`\n[${f.status}] ${f.name}`);
  if (f.evidence) log(`  ${JSON.stringify(f.evidence, null, 2).slice(0, 600)}`);
  if (f.error) log(`  error: ${f.error}`);
}
const failed = flows.filter(f => f.status === 'FAIL');
log(`\n${flows.length - failed.length}/${flows.length} passed`);
log(`creator errors total: ${errors.creator.length}`);
log(`customer errors total: ${errors.customer.length}`);
process.exit(failed.length > 0 ? 1 : 0);
