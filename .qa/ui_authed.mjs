// Logged-in customer UI smoke. Uses the qa-cust account confirmed via SQL.
import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'fs';

const PROD = 'https://creator-dm-hub.vercel.app';
const SCREEN_DIR = '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens';
if (!existsSync(SCREEN_DIR)) mkdirSync(SCREEN_DIR, { recursive: true });

// Most recently created qa-cust from the last public run + its known password
// (the SQL UPDATE just confirmed all qa-cust-% accounts)
const STAMP = '1778760223721';
const CUST = {
  email: `qa-cust-${STAMP}@inboxbear.com`,
  password: `QaTest!${STAMP}`,
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

const events = { console: [], httpErrors: [], pageerror: [] };
const resetEvents = () => { for (const k of Object.keys(events)) events[k].length = 0; };
page.on('console', m => { if (m.type() === 'error') events.console.push(m.text()); });
page.on('pageerror', e => events.pageerror.push(e.message));
page.on('response', async (r) => {
  if (r.status() >= 400) {
    let body = '';
    try { body = (await r.text()).slice(0, 400); } catch {}
    const u = new URL(r.url());
    events.httpErrors.push(`${r.status()} ${u.pathname}${u.search.slice(0,80)} :: ${body}`);
  }
});
const shoot = async (n) => page.screenshot({ path: `${SCREEN_DIR}/${n}.png` });
const ev = () => ({
  console: events.console.slice(0, 5),
  pageerror: events.pageerror.slice(0, 3),
  httpErrors: events.httpErrors.slice(0, 5),
});

// ─── FLOW: Login ───
await track('Login as qa-cust', async () => {
  resetEvents();
  await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').first().fill(CUST.email);
  await page.locator('input[type=password]').first().fill(CUST.password);
  await page.locator('button[type=submit]').first().click();
  await page.waitForTimeout(3000);
  await shoot('A_01_post_login');
  const url = page.url();
  if (url.includes('/auth')) {
    const body = (await page.textContent('body')).replace(/\s+/g,' ');
    throw new Error(`stayed on /auth. body: ${body.slice(0, 250)}`);
  }
  return { landedAt: url, events: ev() };
});

const loggedIn = !page.url().includes('/auth');
if (!loggedIn) {
  log('\nLogin failed — aborting downstream tests.');
  await browser.close();
  process.exit(1);
}

// ─── FLOW: Browse to michelle (logged in) ───
await track('Logged-in customer visits michelle profile', async () => {
  resetEvents();
  await page.goto(`${PROD}/Michellebieri`, { waitUntil: 'networkidle' });
  await shoot('A_02_michelle_logged_in');
  const body = (await page.textContent('body')).replace(/\s+/g,' ');
  const notFound = /creator not found|could not find/i.test(body);
  if (notFound) throw new Error(`even logged in, profile NOT FOUND. body: ${body.slice(0,250)}`);
  return { bodySnippet: body.slice(0, 250), events: ev() };
});

// ─── FLOW: Open chat with michelle ───
await track('Open chat / Message michelle button', async () => {
  resetEvents();
  // Find Message button on profile
  const msgBtn = page.getByRole('button', { name: /message|chat|send/i }).first();
  if (await msgBtn.count() === 0) {
    // alt: navigate directly to messages
    await page.goto(`${PROD}/messages?creator=e394bb4b-3d73-4c7a-96ff-9ff802e0f5d0`, { waitUntil: 'networkidle' });
  } else {
    await msgBtn.click();
    await page.waitForTimeout(1500);
  }
  await shoot('A_03_chat_view');
  const body = (await page.textContent('body')).replace(/\s+/g,' ');
  return { url: page.url(), bodySnippet: body.slice(0, 300), events: ev() };
});

// ─── FLOW: Send a message ───
await track('Type and send a message', async () => {
  resetEvents();
  const textarea = page.locator('textarea, input[placeholder*=message i]').first();
  if (await textarea.count() === 0) throw new Error('no message input');
  const testMsg = `Playwright authed test ${Date.now()}`;
  await textarea.fill(testMsg);
  await shoot('A_04_message_typed');

  // The send button is typically last button with no text (paperplane icon)
  const sendBtn = page.locator('button:has(svg)').last();
  await sendBtn.click();
  await page.waitForTimeout(3500);
  await shoot('A_05_after_send');
  const body = (await page.textContent('body')).replace(/\s+/g,' ');
  const success = /message sent|sent successfully/i.exec(body);
  const fail = /send failed|insufficient|no entitlement|edge function.*non-2xx|failed to send/i.exec(body);
  return {
    success: success?.[0] || null,
    fail: fail?.[0] || null,
    bodySnippet: body.slice(0, 250),
    events: ev(),
  };
});

// ─── FLOW: Conversations inbox ───
await track('Conversations inbox renders', async () => {
  resetEvents();
  await page.goto(`${PROD}/conversations`, { waitUntil: 'networkidle' });
  await shoot('A_06_conversations');
  const body = (await page.textContent('body')).replace(/\s+/g,' ');
  return { bodySnippet: body.slice(0, 300), events: ev() };
});

// ─── FLOW: Wallet page ───
await track('Wallet page renders', async () => {
  resetEvents();
  await page.goto(`${PROD}/wallet`, { waitUntil: 'networkidle' });
  await shoot('A_07_wallet');
  const body = (await page.textContent('body')).replace(/\s+/g,' ');
  const balanceMatch = /balance[:\s]*\$?[\d.,]+/i.exec(body);
  return { balance: balanceMatch?.[0] || null, bodySnippet: body.slice(0, 250), events: ev() };
});

// ─── FLOW: Logout ───
await track('Logout', async () => {
  resetEvents();
  await page.goto(`${PROD}/more`, { waitUntil: 'networkidle' }).catch(() => {});
  const logoutBtn = page.getByRole('button', { name: /sign ?out|log ?out/i }).first();
  const logoutLink = page.getByRole('link', { name: /sign ?out|log ?out/i }).first();
  if (await logoutBtn.count() > 0) await logoutBtn.click();
  else if (await logoutLink.count() > 0) await logoutLink.click();
  else throw new Error('no logout control visible');
  await page.waitForTimeout(2000);
  await shoot('A_08_after_logout');
  const url = page.url();
  return { url, events: ev() };
});

await browser.close();

log(`\n═══ SUMMARY ═══`);
for (const f of flows) {
  log(`\n[${f.status}] ${f.name}`);
  if (f.evidence) log(`  evidence: ${JSON.stringify(f.evidence, null, 2).slice(0, 800)}`);
  if (f.error) log(`  error: ${f.error}`);
}
const fails = flows.filter(f => f.status === 'FAIL');
log(`\n${flows.length - fails.length}/${flows.length} passed`);
writeFileSync(`${SCREEN_DIR}/_results_authed.json`, JSON.stringify(flows, null, 2));
process.exit(fails.length ? 1 : 0);
