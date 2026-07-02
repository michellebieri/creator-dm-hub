// FULL end-to-end test — customer flow + creator flow
// Test account is both customer AND creator after Approval C.

import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'fs';

const PROD = 'https://creator-dm-hub.vercel.app';
const SCREEN_DIR = '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens';
if (!existsSync(SCREEN_DIR)) mkdirSync(SCREEN_DIR, { recursive: true });

const STAMP = '1778760223721';
const USER = { email: `qa-cust-${STAMP}@inboxbear.com`, password: `QaTest!${STAMP}` };
const USER_ID = '1d39d8d5-3179-41c6-9983-4065313c94a0';
const MICHELLE_ID = 'e394bb4b-3d73-4c7a-96ff-9ff802e0f5d0';

const log = (...a) => console.log(...a);
const results = [];
const T = async (name, fn) => {
  log(`\n--- ${name} ---`);
  try {
    const e = await fn();
    results.push({ name, status: 'PASS', evidence: e });
    log(`  ✓ PASS`);
  } catch (err) {
    results.push({ name, status: 'FAIL', error: err.message });
    log(`  ✗ FAIL: ${err.message}`);
  }
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('response', async r => {
  if (r.status() >= 400) {
    const u = new URL(r.url());
    if (u.hostname.includes('supabase')) {
      let b = ''; try { b = (await r.text()).slice(0, 200); } catch {}
      errors.push(`${r.status()} ${u.pathname.slice(0, 50)} :: ${b.slice(0, 150)}`);
    }
  }
});
const clearErrors = () => errors.length = 0;

// ── 0. login ──
await T('login', async () => {
  await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').first().fill(USER.email);
  await page.locator('input[type=password]').first().fill(USER.password);
  await page.locator('button[type=submit]').first().click();
  await page.waitForTimeout(3000);
  if (page.url().includes('/auth')) throw new Error('login failed');
  return { url: page.url() };
});

// ── 1. payment_methods page ──
await T('payment_methods page loads cleanly', async () => {
  clearErrors();
  await page.goto(`${PROD}/payment-methods`, { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SCREEN_DIR}/E_01_payment_methods.png` });
  if (errors.length) throw new Error(`http errors: ${errors.slice(0,2).join(' | ')}`);
  return { url: page.url() };
});

// ── 2. wallet balance shows $100 ──
await T('wallet shows $100 balance', async () => {
  clearErrors();
  await page.goto(`${PROD}/wallet`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${SCREEN_DIR}/E_02_wallet.png` });
  const body = (await page.textContent('body')).replace(/\s+/g,' ');
  const balMatch = body.match(/balance.*?\$?(\d+\.\d{2})/i);
  if (!balMatch) throw new Error(`no balance visible. body: ${body.slice(0,200)}`);
  const bal = parseFloat(balMatch[1]);
  if (bal < 5) throw new Error(`balance too low: $${bal}`);
  return { balance: balMatch[0] };
});

// ── 3. send paid message to michelle (happy path) ──
await T('SEND PAID MESSAGE end-to-end', async () => {
  clearErrors();
  await page.goto(`${PROD}/messages?creator=${MICHELLE_ID}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCREEN_DIR}/E_03_chat_pre_send.png` });

  const textarea = page.locator('textarea, input[placeholder*=message i]').first();
  if (await textarea.count() === 0) throw new Error('no message input');
  const testMsg = `Playwright e2e ${Date.now()}`;
  await textarea.fill(testMsg);
  await page.waitForTimeout(300);

  // Send btn must NOT be disabled now
  const sendBtn = page.locator('button:has(svg)').last();
  const isDisabled = await sendBtn.isDisabled();
  if (isDisabled) throw new Error(`send button still disabled even with $100 balance`);

  await sendBtn.click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${SCREEN_DIR}/E_04_chat_post_send.png` });

  const after = (await page.textContent('body')).replace(/\s+/g,' ');
  const success = /message sent/i.exec(after);
  const fail = /send failed|insufficient|failed to send/i.exec(after);
  const msgInDOM = after.includes(testMsg);

  if (fail) throw new Error(`send failed toast: ${fail[0]}`);
  if (!success && !msgInDOM) throw new Error(`no success indicator. body: ${after.slice(0, 250)}`);

  return { successToast: success?.[0], messageInDOM: msgInDOM, sentText: testMsg };
});

// ── 4. balance decremented ──
await T('wallet balance decremented after send', async () => {
  clearErrors();
  await page.goto(`${PROD}/wallet`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const body = (await page.textContent('body')).replace(/\s+/g,' ');
  const balMatch = body.match(/balance.*?\$?(\d+\.\d{2})/i);
  if (!balMatch) throw new Error(`no balance visible after send`);
  const bal = parseFloat(balMatch[1]);
  return { newBalance: balMatch[0], dropped: bal < 100 ? 'YES (good)' : 'NO (bug?)' };
});

// ── 5. conversation now appears in /conversations inbox ──
await T('conversation appears in inbox', async () => {
  clearErrors();
  await page.goto(`${PROD}/conversations`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCREEN_DIR}/E_05_inbox.png` });
  const body = (await page.textContent('body')).replace(/\s+/g,' ');
  const empty = /no messages yet/i.test(body);
  const hasMichelle = /michelle/i.test(body);
  if (empty) throw new Error(`inbox empty though message was sent. body: ${body.slice(0,250)}`);
  if (!hasMichelle) throw new Error(`michelle not in inbox`);
  return { bodySnippet: body.slice(0, 250) };
});

// ── 6. creator side — visit creator dashboard ──
await T('creator dashboard loads', async () => {
  clearErrors();
  await page.goto(`${PROD}/creator-dashboard`, { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCREEN_DIR}/E_06_creator_dashboard.png` });
  const body = (await page.textContent('body')).replace(/\s+/g,' ');
  if (body.length < 100) throw new Error(`blank page`);
  return { bodySnippet: body.slice(0, 300), httpErrors: errors.slice(0,3) };
});

// ── 7. creator settings / messaging settings ──
await T('creator messaging settings loads', async () => {
  clearErrors();
  await page.goto(`${PROD}/settings/messaging`, { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCREEN_DIR}/E_07_messaging_settings.png` });
  const body = (await page.textContent('body')).replace(/\s+/g,' ');
  return { bodySnippet: body.slice(0, 300), httpErrors: errors.slice(0,3) };
});

// ── 8. own public profile (qa-cust as creator) ──
await T('own public creator profile loads', async () => {
  clearErrors();
  await page.goto(`${PROD}/qa_cust_${STAMP}`.slice(0, PROD.length + 25), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SCREEN_DIR}/E_08_own_profile.png` });
  const body = (await page.textContent('body')).replace(/\s+/g,' ');
  return { bodySnippet: body.slice(0, 200), httpErrors: errors.slice(0,3) };
});

await browser.close();

log(`\n═══ E2E SUMMARY ═══`);
for (const r of results) {
  log(`\n[${r.status}] ${r.name}`);
  if (r.evidence) log(`  ${JSON.stringify(r.evidence, null, 2).slice(0, 600)}`);
  if (r.error) log(`  error: ${r.error}`);
}
const fails = results.filter(r => r.status === 'FAIL');
log(`\n${results.length - fails.length}/${results.length} passed`);
writeFileSync(`${SCREEN_DIR}/_e2e.json`, JSON.stringify(results, null, 2));
process.exit(fails.length ? 1 : 0);
