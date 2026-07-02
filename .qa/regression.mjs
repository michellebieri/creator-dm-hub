// Full fresh-account regression sweep — two roles, multiple sends,
// refreshes between every action, persistence verification.
//
// Phase 1: sign up fresh creator + fresh customer via UI
// Phase 2: (after user runs seed SQL) login as each and run all flows
//
// Run with --phase=1 or --phase=2

import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';

const PROD = 'https://creator-dm-hub.vercel.app';
const SCREEN_DIR = '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens';
const STATE_FILE = '/Users/michellebieri/Desktop/Coding/dmme/.qa/regression_state.json';
if (!existsSync(SCREEN_DIR)) mkdirSync(SCREEN_DIR, { recursive: true });

const phase = process.argv.find(a => a.startsWith('--phase='))?.split('=')[1] || '1';
const log = (...a) => console.log(...a);

const browser = await chromium.launch();

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1: sign up two fresh accounts
// ═══════════════════════════════════════════════════════════════════════════
if (phase === '1') {
  const stamp = Date.now();
  // Note: signup form enforces username max 20 chars (zod)
  const short = stamp.toString().slice(-9);  // 9 digits is unique enough for a test
  const CREATOR = {
    email: `qa-fresh-creator-${stamp}@inboxbear.com`,
    password: `QaTest!${stamp}`,
    username: `qac${short}`.slice(0, 20),  // 12 chars
    display_name: `QA Fresh Creator ${stamp}`,
  };
  const CUSTOMER = {
    email: `qa-fresh-cust-${stamp}@inboxbear.com`,
    password: `QaTest!${stamp}`,
    username: `qau${short}`.slice(0, 20),  // 12 chars
    display_name: `QA Fresh Customer ${stamp}`,
  };

  for (const user of [CREATOR, CUSTOMER]) {
    log(`\n=== signing up ${user.email} ===`);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: /sign ?up/i }).click();
    await page.waitForTimeout(500);
    const u = page.locator('input[id*=username i], input[placeholder*=username i]').first();
    if (await u.count() > 0) await u.fill(user.username);
    const d = page.locator('input[id*=display i], input[placeholder*=display i], input[placeholder*=name i]:not([type=email])').first();
    if (await d.count() > 0) await d.fill(user.display_name);
    await page.locator('input[type=email]').first().fill(user.email);
    await page.locator('input[type=password]').first().fill(user.password);
    await page.locator('button[type=submit]').first().click();
    await page.waitForTimeout(3000);
    const body = (await page.textContent('body')).replace(/\s+/g,' ');
    // Genuine success signals (Sonner toast text only)
    const created = /Account created!.*confirm your account/i.test(body);
    const validationErr = body.match(/String must contain|invalid email|already (registered|exists)/i);
    log(`  signup ${created ? '✓' : '✗'} (validation: ${validationErr?.[0] || 'none'})`);
    log(`    body: ${body.slice(0, 180)}`);
    await ctx.close();
    if (!created) throw new Error(`signup failed for ${user.email}: ${validationErr?.[0] || 'unknown'}`);
  }

  writeFileSync(STATE_FILE, JSON.stringify({ CREATOR, CUSTOMER }, null, 2));

  log(`\n\n═══════════════════════════════════════════════════════════════`);
  log(`PHASE 1 DONE.`);
  log(`Creator:  ${CREATOR.email}`);
  log(`Customer: ${CUSTOMER.email}`);
  log(`\nNOW PASTE THIS SEED SQL IN SUPABASE → SQL EDITOR:`);
  log(``);
  log(`-- Auto-confirm emails (test users only — by email prefix)`);
  log(`UPDATE auth.users SET email_confirmed_at = NOW()`);
  log(`WHERE email LIKE 'qa-fresh-%';`);
  log(``);
  log(`-- Promote the fresh creator to creator role + give them settings`);
  log(`INSERT INTO public.user_roles (user_id, role)`);
  log(`SELECT id, 'creator' FROM auth.users WHERE email LIKE 'qa-fresh-creator-%'`);
  log(`ON CONFLICT DO NOTHING;`);
  log(``);
  log(`INSERT INTO public.creator_settings (user_id, price_per_message, is_accepting_messages)`);
  log(`SELECT id, 5.00, true FROM auth.users WHERE email LIKE 'qa-fresh-creator-%'`);
  log(`ON CONFLICT (user_id) DO NOTHING;`);
  log(``);
  log(`INSERT INTO public.message_packs (creator_id, quantity, price, discount_percentage, is_active)`);
  log(`SELECT id, 10, 45.00, 10, true FROM auth.users WHERE email LIKE 'qa-fresh-creator-%'`);
  log(`ON CONFLICT DO NOTHING;`);
  log(``);
  log(`-- Fund the fresh customer wallet`);
  log(`UPDATE public.profiles SET wallet_balance = 100.00`);
  log(`WHERE id IN (SELECT id FROM auth.users WHERE email LIKE 'qa-fresh-cust-%');`);
  log(``);
  log(`Then run: node .qa/regression.mjs --phase=2`);
  await browser.close();
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2: full regression with both fresh accounts
// ═══════════════════════════════════════════════════════════════════════════
if (phase === '2') {
  const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  const { CREATOR, CUSTOMER } = state;

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

  // ─── one browser per role ───
  const creatorCtx = await browser.newContext();
  const creatorPage = await creatorCtx.newPage();
  const customerCtx = await browser.newContext();
  const customerPage = await customerCtx.newPage();

  // Attach error tracking
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

  // Helper: login a page as a user
  const login = async (page, user) => {
    await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
    await page.locator('input[type=email]').first().fill(user.email);
    await page.locator('input[type=password]').first().fill(user.password);
    await page.locator('button[type=submit]').first().click();
    await page.waitForTimeout(3000);
    if (page.url().includes('/auth')) throw new Error(`login failed for ${user.email}`);
  };

  // ── A1: Creator login + dashboard ──
  await T('A1 — Fresh creator login + dashboard', async () => {
    evClear();
    await login(creatorPage, CREATOR);
    await creatorPage.goto(`${PROD}/creator-dashboard`, { waitUntil: 'networkidle' });
    await creatorPage.waitForTimeout(1000);
    const body = (await creatorPage.textContent('body')).replace(/\s+/g, ' ');
    return { url: creatorPage.url(), snippet: body.slice(0, 250), errors: errors.creator.slice(0,3) };
  });

  // ── A2: Creator profile page (own) — pricing visible ──
  await T('A2 — Fresh creator own public profile shows $5/msg', async () => {
    evClear();
    const profileUrl = `${PROD}/${CREATOR.username}`;
    await creatorPage.goto(profileUrl, { waitUntil: 'networkidle' });
    await creatorPage.waitForTimeout(1000);
    const body = (await creatorPage.textContent('body')).replace(/\s+/g, ' ');
    if (/creator not found/i.test(body)) throw new Error(`creator not found on own URL`);
    if (!/\$5/.test(body)) throw new Error(`price not visible. snippet: ${body.slice(0,200)}`);
    return { url: profileUrl, snippet: body.slice(0, 200) };
  });

  // ── A3: Anon visits creator profile ──
  await T('A3 — Anon visitor sees fresh creator profile + price', async () => {
    const anonCtx = await browser.newContext();
    const anonPage = await anonCtx.newPage();
    await anonPage.goto(`${PROD}/${CREATOR.username}`, { waitUntil: 'networkidle' });
    await anonPage.waitForTimeout(1000);
    const body = (await anonPage.textContent('body')).replace(/\s+/g, ' ');
    await anonCtx.close();
    if (/creator not found/i.test(body)) throw new Error(`anon got Creator not found`);
    if (!/\$5/.test(body)) throw new Error(`anon doesn't see price`);
    return { snippet: body.slice(0, 200) };
  });

  // ── B1: Customer login + wallet shows $100 ──
  await T('B1 — Fresh customer login + wallet $100', async () => {
    evClear();
    await login(customerPage, CUSTOMER);
    await customerPage.goto(`${PROD}/wallet`, { waitUntil: 'networkidle' });
    await customerPage.waitForTimeout(800);
    const body = (await customerPage.textContent('body')).replace(/\s+/g, ' ');
    const bal = body.match(/balance[^\d]*\$?(\d+\.\d{2})/i);
    if (!bal) throw new Error(`no balance in body`);
    if (parseFloat(bal[1]) < 100) throw new Error(`balance ${bal[0]} < expected $100`);
    return { balance: bal[0] };
  });

  // ── B2: Customer opens fresh creator's profile ──
  await T('B2 — Customer opens fresh creator profile', async () => {
    evClear();
    await customerPage.goto(`${PROD}/${CREATOR.username}`, { waitUntil: 'networkidle' });
    await customerPage.waitForTimeout(1000);
    const body = (await customerPage.textContent('body')).replace(/\s+/g, ' ');
    if (/creator not found/i.test(body)) throw new Error(`creator not found`);
    if (!/\$5/.test(body)) throw new Error(`price not visible`);
    return { snippet: body.slice(0, 200) };
  });

  // Get creator's user_id from the page (need it to navigate to chat)
  // We'll do this by querying the URL or by looking up the profile

  let creatorUserId = null;
  await T('B3 — Find creator user_id (for chat URL)', async () => {
    // Use the Chat button on the profile and follow where it goes
    const chatBtn = customerPage.getByRole('button', { name: /^chat$/i }).first();
    if (await chatBtn.count() === 0) {
      // Try as link
      const chatLink = customerPage.getByRole('link', { name: /^chat$/i }).first();
      if (await chatLink.count() === 0) throw new Error('no Chat button/link');
      await chatLink.click();
    } else {
      await chatBtn.click();
    }
    await customerPage.waitForTimeout(2000);
    const url = customerPage.url();
    const m = url.match(/creator=([0-9a-f-]+)/);
    if (!m) throw new Error(`no creator UUID in chat URL: ${url}`);
    creatorUserId = m[1];
    return { creatorUserId, url };
  });

  // ── B4: Customer sends first message ──
  const msg1 = `Regression msg 1 — ${Date.now()}`;
  await T(`B4 — Customer sends message 1: "${msg1}"`, async () => {
    evClear();
    const textarea = customerPage.locator('textarea, input[placeholder*=message i]').first();
    if (await textarea.count() === 0) throw new Error('no message input');
    await textarea.fill(msg1);
    await customerPage.waitForTimeout(300);
    const sendBtn = customerPage.locator('button').filter({ has: customerPage.locator('svg.lucide-send') }).first();
    if (await sendBtn.isDisabled()) throw new Error('send button disabled');
    await sendBtn.click();
    await customerPage.waitForTimeout(3500);
    const body = (await customerPage.textContent('body')).replace(/\s+/g, ' ');
    if (!/message sent/i.test(body)) throw new Error(`no Message sent toast`);
    if (!body.includes(msg1)) throw new Error(`message text not visible in page`);
    return { success: true };
  });

  // ── B5: Wallet decremented to $95 ──
  await T('B5 — Wallet decremented to $95', async () => {
    await customerPage.goto(`${PROD}/wallet`, { waitUntil: 'networkidle' });
    await customerPage.waitForTimeout(800);
    const body = (await customerPage.textContent('body')).replace(/\s+/g, ' ');
    const bal = body.match(/balance[^\d]*\$?(\d+\.\d{2})/i);
    if (!bal) throw new Error('no balance');
    if (parseFloat(bal[1]) !== 95.00) throw new Error(`expected $95.00, got ${bal[0]}`);
    return { balance: bal[0] };
  });

  // ── B6: Customer inbox shows the conversation ──
  await T('B6 — Customer inbox shows conversation with msg1', async () => {
    await customerPage.goto(`${PROD}/conversations`, { waitUntil: 'networkidle' });
    await customerPage.waitForTimeout(1500);
    const body = (await customerPage.textContent('body')).replace(/\s+/g, ' ');
    if (/no messages yet/i.test(body)) throw new Error('inbox empty');
    if (!body.includes(CREATOR.display_name) && !body.toLowerCase().includes(CREATOR.username.toLowerCase())) {
      throw new Error(`creator name not in inbox snippet: ${body.slice(0,200)}`);
    }
    return { snippet: body.slice(0, 300) };
  });

  // ── C1: Creator sees the message in their inbox ──
  await T('C1 — Creator inbox shows new conversation', async () => {
    await creatorPage.goto(`${PROD}/conversations`, { waitUntil: 'networkidle' });
    await creatorPage.waitForTimeout(2000);
    const body = (await creatorPage.textContent('body')).replace(/\s+/g, ' ');
    if (/no messages yet/i.test(body)) throw new Error('creator inbox empty');
    if (!body.includes(CUSTOMER.display_name) && !body.toLowerCase().includes(CUSTOMER.username.toLowerCase())) {
      throw new Error(`customer name not in creator inbox: ${body.slice(0,200)}`);
    }
    return { snippet: body.slice(0, 300) };
  });

  // ── C2: Creator opens the conversation, sees msg1 ──
  await T('C2 — Creator opens conversation, sees msg1', async () => {
    // Click the first conversation link
    const convoLink = creatorPage.locator(`text=${CUSTOMER.display_name.slice(0, 20)}`).first();
    if (await convoLink.count() === 0) {
      // Try alternate selector
      await creatorPage.goto(`${PROD}/messages?creator=${creatorUserId}`, { waitUntil: 'networkidle' });
    } else {
      await convoLink.click();
    }
    await creatorPage.waitForTimeout(1500);
    const body = (await creatorPage.textContent('body')).replace(/\s+/g, ' ');
    if (!body.includes(msg1)) throw new Error(`msg1 not visible in creator chat. snippet: ${body.slice(0,200)}`);
    return { foundMsg1: true };
  });

  // ── D1: Refresh customer page, msg1 persists ──
  await T('D1 — Refresh customer chat, msg1 still visible', async () => {
    await customerPage.goto(`${PROD}/messages?creator=${creatorUserId}`, { waitUntil: 'networkidle' });
    await customerPage.waitForTimeout(1500);
    const body = (await customerPage.textContent('body')).replace(/\s+/g, ' ');
    if (!body.includes(msg1)) throw new Error('msg1 missing after customer refresh');
    return { foundMsg1: true };
  });

  // ── D2: Refresh creator page, msg1 persists ──
  await T('D2 — Refresh creator chat, msg1 still visible', async () => {
    await creatorPage.reload({ waitUntil: 'networkidle' });
    await creatorPage.waitForTimeout(1500);
    const body = (await creatorPage.textContent('body')).replace(/\s+/g, ' ');
    if (!body.includes(msg1)) throw new Error('msg1 missing after creator refresh');
    return { foundMsg1: true };
  });

  // ── E: Repeatability — send 3 more messages with refreshes between ──
  const msgs = [];
  for (let i = 2; i <= 4; i++) {
    const msg = `Regression msg ${i} — ${Date.now()}`;
    msgs.push(msg);
    await T(`E${i-1} — Send + refresh msg ${i}`, async () => {
      // Refresh between
      await customerPage.goto(`${PROD}/messages?creator=${creatorUserId}`, { waitUntil: 'networkidle' });
      await customerPage.waitForTimeout(1500);
      const textarea = customerPage.locator('textarea, input[placeholder*=message i]').first();
      await textarea.fill(msg);
      await customerPage.waitForTimeout(300);
      const sendBtn = customerPage.locator('button').filter({ has: customerPage.locator('svg.lucide-send') }).first();
      if (await sendBtn.isDisabled()) throw new Error('send disabled');
      await sendBtn.click();
      await customerPage.waitForTimeout(3500);
      // Reload + verify
      await customerPage.reload({ waitUntil: 'networkidle' });
      await customerPage.waitForTimeout(1500);
      const body = (await customerPage.textContent('body')).replace(/\s+/g, ' ');
      if (!body.includes(msg)) throw new Error(`msg${i} missing after reload`);
      return { msg };
    });
  }

  // ── F: Final wallet check (should be $100 - 4*$5 = $80) ──
  await T('F — Final wallet balance after 4 messages = $80', async () => {
    await customerPage.goto(`${PROD}/wallet`, { waitUntil: 'networkidle' });
    await customerPage.waitForTimeout(1000);
    const body = (await customerPage.textContent('body')).replace(/\s+/g, ' ');
    const bal = body.match(/balance[^\d]*\$?(\d+\.\d{2})/i);
    if (parseFloat(bal[1]) !== 80.00) throw new Error(`expected $80, got ${bal[0]}`);
    return { balance: bal[0] };
  });

  // ── G: Re-login persistence ──
  await T('G — Customer logs out, logs back in, conversation still there', async () => {
    // Hard logout via clearing context
    await customerCtx.clearCookies();
    await customerPage.context().storageState({ path: '/tmp/_clear.json' });
    await customerPage.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
    await customerPage.waitForTimeout(500);
    await customerPage.locator('input[type=email]').first().fill(CUSTOMER.email);
    await customerPage.locator('input[type=password]').first().fill(CUSTOMER.password);
    await customerPage.locator('button[type=submit]').first().click();
    await customerPage.waitForTimeout(3000);
    await customerPage.goto(`${PROD}/conversations`, { waitUntil: 'networkidle' });
    await customerPage.waitForTimeout(1500);
    const body = (await customerPage.textContent('body')).replace(/\s+/g, ' ');
    if (/no messages yet/i.test(body)) throw new Error('inbox empty after re-login');
    // All 4 messages should be in the inbox preview or accessible
    return { snippet: body.slice(0, 300) };
  });

  // ── H: No duplicates — verify exactly 4 messages in customer chat view ──
  await T('H — Exactly 4 customer-sent messages visible (no duplicates)', async () => {
    await customerPage.goto(`${PROD}/messages?creator=${creatorUserId}`, { waitUntil: 'networkidle' });
    await customerPage.waitForTimeout(1500);
    const body = (await customerPage.textContent('body')).replace(/\s+/g, ' ');
    const allMsgs = [msg1, ...msgs];
    for (const m of allMsgs) {
      // Count substring occurrences — should be exactly 1 per message
      const count = (body.match(new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (count !== 1) throw new Error(`message "${m.slice(0,30)}..." appears ${count} times (expected 1)`);
    }
    return { messageCount: allMsgs.length };
  });

  // ── I: Regression — old test user (qa-cust-1778760223721) still works ──
  await T('I — Old repaired test user still works (regression isolation)', async () => {
    const oldCtx = await browser.newContext();
    const oldPage = await oldCtx.newPage();
    await oldPage.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
    await oldPage.locator('input[type=email]').first().fill('qa-cust-1778760223721@inboxbear.com');
    await oldPage.locator('input[type=password]').first().fill('QaTest!1778760223721');
    await oldPage.locator('button[type=submit]').first().click();
    await oldPage.waitForTimeout(3000);
    if (oldPage.url().includes('/auth')) throw new Error('old user can no longer login');
    await oldPage.goto(`${PROD}/conversations`, { waitUntil: 'networkidle' });
    await oldPage.waitForTimeout(1500);
    const body = (await oldPage.textContent('body')).replace(/\s+/g, ' ');
    await oldCtx.close();
    return { snippet: body.slice(0, 200) };
  });

  await browser.close();

  log(`\n═══ REGRESSION SUMMARY ═══`);
  for (const f of flows) {
    log(`[${f.status}] ${f.name}`);
    if (f.evidence) log(`  ${JSON.stringify(f.evidence, null, 2).slice(0, 400)}`);
    if (f.error) log(`  error: ${f.error}`);
  }
  const fails = flows.filter(f => f.status === 'FAIL');
  log(`\n${flows.length - fails.length}/${flows.length} passed`);
  log(`creator errors: ${errors.creator.length}`);
  log(`customer errors: ${errors.customer.length}`);
  writeFileSync(`${SCREEN_DIR}/_regression.json`, JSON.stringify({ flows, errors }, null, 2));
  process.exit(fails.length ? 1 : 0);
}
