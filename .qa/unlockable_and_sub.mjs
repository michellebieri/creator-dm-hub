// LIVE end-to-end test of unlockable content flow + subscription flow
// using the fresh creator + fresh customer already set up.

import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const PROD = 'https://creator-dm-hub.vercel.app';
const STATE = JSON.parse(readFileSync('/Users/michellebieri/Desktop/Coding/dmme/.qa/regression_state.json', 'utf8'));
const CREATOR = STATE.CREATOR;
const CUST = STATE.CUSTOMER;

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
      let b = ''; try { b = (await r.text()).slice(0, 250); } catch {}
      errors[key].push(`${r.status()} ${new URL(r.url()).pathname.slice(0,55)} :: ${b.slice(0, 200)}`);
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

// ═══════════════════════════════════════════════════════════════════
// UNLOCKABLE FLOW
// ═══════════════════════════════════════════════════════════════════

await T('U1 — Both users log in', async () => {
  await login(creatorPage, CREATOR);
  await login(customerPage, CUST);
  return { creator: creatorPage.url(), customer: customerPage.url() };
});

// Creator opens existing chat with customer (already exists from Phase 2)
await T('U2 — Creator opens chat with customer', async () => {
  evClear();
  await creatorPage.goto(`${PROD}/conversations`, { waitUntil: 'networkidle' });
  await creatorPage.waitForTimeout(1500);
  // Click the conversation with QA Fresh Customer
  const convo = creatorPage.locator(`text=${CUST.display_name.slice(0, 20)}`).first();
  if (await convo.count() === 0) throw new Error('no conversation visible in creator inbox');
  await convo.click();
  await creatorPage.waitForTimeout(1500);
  return { url: creatorPage.url(), errors: errors.creator.slice(0,2) };
});

// Creator clicks "Send Unlockable"
let uploadDialogOpen = false;
await T('U3 — Creator opens Send Unlockable dialog', async () => {
  evClear();
  const btn = creatorPage.getByRole('button', { name: /send unlockable/i }).first();
  if (await btn.count() === 0) throw new Error('Send Unlockable button not visible');
  await btn.click();
  await creatorPage.waitForTimeout(800);
  uploadDialogOpen = true;
  await creatorPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/U_03_dialog.png' });
  return { opened: true };
});

// Creator fills out dialog + attaches a tiny image
const TEST_IMG_PATH = '/tmp/qa_test_unlockable.png';
import { writeFileSync } from 'fs';
// minimal 1x1 PNG
const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
writeFileSync(TEST_IMG_PATH, PNG_1x1);

await T('U4 — Creator fills dialog + uploads tiny test image @ $5', async () => {
  evClear();
  // Fill title
  const titleInput = creatorPage.locator('input').filter({ hasNot: creatorPage.locator('[type=file]') }).nth(0);
  await titleInput.fill('Test unlockable');
  // Fill message
  const msgInput = creatorPage.locator('input, textarea').nth(2);
  await msgInput.fill('test message for unlockable');
  // Price already $5 by default? Set it.
  const priceInput = creatorPage.locator('input[type=number]').first();
  if (await priceInput.count() > 0) await priceInput.fill('5');
  // Attach file
  const fileInput = creatorPage.locator('input[type=file]').first();
  await fileInput.setInputFiles(TEST_IMG_PATH);
  await creatorPage.waitForTimeout(500);
  await creatorPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/U_04_filled.png' });

  // Click submit
  const submitBtn = creatorPage.getByRole('button', { name: /send unlockable content/i }).first();
  if (await submitBtn.count() === 0) throw new Error('Send Unlockable Content submit button not found');
  await submitBtn.click();
  await creatorPage.waitForTimeout(4500);
  await creatorPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/U_05_after_submit.png' });

  const body = (await creatorPage.textContent('body')).replace(/\s+/g,' ');
  const success = /unlockable content sent|sent successfully/i.exec(body);
  const fail = /failed|error/i.exec(body);
  return {
    successToast: success?.[0] || null,
    failToast: fail?.[0] || null,
    httpErrors: errors.creator.slice(0, 3),
  };
});

// Customer side — open same chat and look for the unlockable
await T('U5 — Customer opens chat with creator, looks for unlockable card', async () => {
  evClear();
  await customerPage.goto(`${PROD}/conversations`, { waitUntil: 'networkidle' });
  await customerPage.waitForTimeout(1500);
  const convo = customerPage.locator(`text=${CREATOR.display_name.slice(0, 20)}`).first();
  if (await convo.count() === 0) throw new Error('creator not visible in customer inbox');
  await convo.click();
  await customerPage.waitForTimeout(2000);
  await customerPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/U_06_customer_chat.png' });

  const body = (await customerPage.textContent('body')).replace(/\s+/g,' ');
  const hasLocked = /locked content|premium content|unlock for/i.test(body);
  const hasMsg = body.includes('test message for unlockable');
  return {
    customerSeesLockedCard: hasLocked,
    customerSeesMessageText: hasMsg,
    bodySnippet: body.slice(0, 400),
    httpErrors: errors.customer.slice(0, 3),
  };
});

// ═══════════════════════════════════════════════════════════════════
// SUBSCRIPTION FLOW
// ═══════════════════════════════════════════════════════════════════

await T('S1 — Creator opens Subscription settings page', async () => {
  evClear();
  await creatorPage.goto(`${PROD}/settings/subscription`, { waitUntil: 'networkidle' });
  await creatorPage.waitForTimeout(1500);
  await creatorPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/S_01_settings.png' });
  const body = (await creatorPage.textContent('body')).replace(/\s+/g, ' ');
  return {
    bodySnippet: body.slice(0, 400),
    httpErrors: errors.creator.slice(0, 3),
  };
});

await browser.close();

log(`\n═══ SUMMARY ═══`);
for (const f of flows) {
  log(`\n[${f.status}] ${f.name}`);
  if (f.evidence) log(`  ${JSON.stringify(f.evidence, null, 2).slice(0, 600)}`);
  if (f.error) log(`  error: ${f.error}`);
}
const fails = flows.filter(f => f.status === 'FAIL');
log(`\n${flows.length - fails.length}/${flows.length} passed`);
log(`creator errors total: ${errors.creator.length}`);
log(`customer errors total: ${errors.customer.length}`);
