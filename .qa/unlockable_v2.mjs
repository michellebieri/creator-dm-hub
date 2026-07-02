// LIVE end-to-end test of unlockable content flow — direct URL navigation
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

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
      let b = ''; try { b = (await r.text()).slice(0, 200); } catch {}
      errors[key].push(`${r.status()} ${new URL(r.url()).pathname.slice(0,55)} :: ${b.slice(0, 200)}`);
    }
  });
};
attach(creatorPage, 'creator');
attach(customerPage, 'customer');

const login = async (page, user) => {
  await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').first().fill(user.email);
  await page.locator('input[type=password]').first().fill(user.password);
  await page.locator('button[type=submit]').first().click();
  await page.waitForTimeout(3000);
};

const getUserId = async (page) => {
  return await page.evaluate(() => {
    const raw = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))[0];
    if (!raw) return null;
    try { return JSON.parse(localStorage.getItem(raw))?.user?.id || JSON.parse(localStorage.getItem(raw))?.access_token?.split('.')[1]; } catch { return null; }
  });
};

await T('Login both', async () => {
  await login(creatorPage, CREATOR);
  await login(customerPage, CUST);
  return { both: 'in' };
});

let creatorId, custId;
await T('Read user IDs from localStorage', async () => {
  creatorId = await getUserId(creatorPage);
  custId = await getUserId(customerPage);
  if (!creatorId) throw new Error('no creator id');
  if (!custId) throw new Error('no customer id');
  log(`  creatorId=${creatorId}`);
  log(`  custId=${custId}`);
  return { creatorId, custId };
});

// ── CREATOR side: open the chat directly ──
await T('Creator opens chat with customer (direct URL)', async () => {
  await creatorPage.goto(`${PROD}/messages?creator=${custId}`, { waitUntil: 'networkidle' });
  await creatorPage.waitForTimeout(2000);
  await creatorPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/V_01_creator_chat.png' });
  const body = (await creatorPage.textContent('body')).replace(/\s+/g,' ');
  const hasSendUnlockable = /send unlockable/i.test(body);
  return { hasSendUnlockable, snippet: body.slice(0, 250) };
});

// ── Creator opens Send Unlockable dialog ──
await T('Creator opens Send Unlockable dialog', async () => {
  errors.creator.length = 0;
  const btn = creatorPage.getByRole('button', { name: /send unlockable/i }).first();
  if (await btn.count() === 0) throw new Error('Send Unlockable button not found');
  await btn.click();
  await creatorPage.waitForTimeout(1000);
  await creatorPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/V_02_dialog_open.png' });
  const heading = await creatorPage.locator('text=/send unlockable content/i').count();
  if (heading === 0) throw new Error('dialog did not open');
  return { opened: true };
});

// Create test image
const TEST_IMG_PATH = '/tmp/qa_unlock.png';
writeFileSync(TEST_IMG_PATH, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64'));
const UNLOCK_MSG = `unlockable test ${Date.now()}`;
const UNLOCK_TITLE = `Test title ${Date.now()}`;

await T('Fill dialog + upload + submit', async () => {
  errors.creator.length = 0;
  // Title (first input in dialog)
  await creatorPage.locator('input[placeholder*=Beach i], input[placeholder*=Workout i]').first().fill(UNLOCK_TITLE);
  // Caption (second input)
  // Skip caption — leave empty
  // Message field — the form labels are: Title, Caption (optional), Message, Media Type, Price (Credits), File
  // Pick the input that follows the "Message" label
  const msgLabel = creatorPage.locator('label', { hasText: /^message$/i }).first();
  const msgInput = msgLabel.locator('xpath=following::input[1] | following::textarea[1]').first();
  await msgInput.fill(UNLOCK_MSG);
  // Price already 5
  // File
  await creatorPage.locator('input[type=file]').first().setInputFiles(TEST_IMG_PATH);
  await creatorPage.waitForTimeout(500);
  await creatorPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/V_03_filled.png' });
  // Submit
  const submit = creatorPage.getByRole('button', { name: /send unlockable content|send.*content/i }).first();
  await submit.click();
  await creatorPage.waitForTimeout(5000);
  await creatorPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/V_04_after_submit.png' });
  const body = (await creatorPage.textContent('body')).replace(/\s+/g,' ');
  return {
    successToast: /unlockable.*sent|sent.*successfully/i.exec(body)?.[0] || null,
    failToast: /failed|error/i.exec(body)?.[0] || null,
    httpErrors: errors.creator.slice(0, 5),
  };
});

// ── CUSTOMER side: open chat and see if unlockable card appears ──
await T('Customer opens chat (direct URL)', async () => {
  errors.customer.length = 0;
  await customerPage.goto(`${PROD}/messages?creator=${creatorId}`, { waitUntil: 'networkidle' });
  await customerPage.waitForTimeout(2500);
  await customerPage.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/V_05_customer_chat.png' });
  const body = (await customerPage.textContent('body')).replace(/\s+/g,' ');
  const seesMessage = body.includes(UNLOCK_MSG);
  const seesLocked = /locked content|premium content|unlock for/i.test(body);
  return {
    seesMessage,
    seesLockedCard: seesLocked,
    snippet: body.slice(0, 400),
    httpErrors: errors.customer.slice(0, 5),
  };
});

await browser.close();

log(`\n═══ SUMMARY ═══`);
for (const f of flows) {
  log(`\n[${f.status}] ${f.name}`);
  if (f.evidence) log(`  ${JSON.stringify(f.evidence, null, 2).slice(0, 700)}`);
  if (f.error) log(`  error: ${f.error}`);
}
const fails = flows.filter(f => f.status === 'FAIL').length;
log(`\n${flows.length - fails}/${flows.length} passed`);
log(`creator errors total: ${errors.creator.length}`);
log(`customer errors total: ${errors.customer.length}`);
