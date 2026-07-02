// 1. Verify anon profile page is fixed (Creator not found → real profile)
// 2. Try send flow as logged-in $0 customer to see exact UX

import { chromium } from 'playwright';

const PROD = 'https://creator-dm-hub.vercel.app';
const STAMP = '1778760223721';
const CUST = { email: `qa-cust-${STAMP}@inboxbear.com`, password: `QaTest!${STAMP}` };

const browser = await chromium.launch();
const ctxAnon = await browser.newContext();
const pageAnon = await ctxAnon.newPage();

// ── Anon profile check ──
console.log('=== 1. Anon visitor → /Michellebieri ===');
const anonErrors = [];
pageAnon.on('response', async r => {
  if (r.status() >= 400) {
    const u = new URL(r.url());
    if (u.hostname.includes('supabase')) {
      let b = ''; try { b = (await r.text()).slice(0, 200); } catch {}
      anonErrors.push(`${r.status()} ${u.pathname}${u.search.slice(0,80)} :: ${b}`);
    }
  }
});
await pageAnon.goto(`${PROD}/Michellebieri`, { waitUntil: 'networkidle' });
const anonBody = (await pageAnon.textContent('body')).replace(/\s+/g,' ');
const anonNotFound = /creator not found|could not find/i.test(anonBody);
console.log(`  page renders: ${anonNotFound ? '✗ STILL Creator not found' : '✓ profile visible'}`);
console.log(`  body snippet: ${anonBody.slice(0, 250)}`);
console.log(`  http errors: ${anonErrors.length}`);
for (const e of anonErrors.slice(0,3)) console.log(`    ${e}`);

await ctxAnon.close();

// ── Authed send-flow check ──
const ctx = await browser.newContext();
const page = await ctx.newPage();
const authedErrors = [];
page.on('response', async r => {
  if (r.status() >= 400) {
    const u = new URL(r.url());
    if (u.hostname.includes('supabase')) {
      let b = ''; try { b = (await r.text()).slice(0, 200); } catch {}
      authedErrors.push(`${r.status()} ${u.pathname}${u.search.slice(0,80)} :: ${b}`);
    }
  }
});

console.log('\n=== 2. Logged-in customer chat with michelle ===');
await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
await page.locator('input[type=email]').first().fill(CUST.email);
await page.locator('input[type=password]').first().fill(CUST.password);
await page.locator('button[type=submit]').first().click();
await page.waitForTimeout(3000);
console.log(`  logged in, url: ${page.url()}`);

await page.goto(`${PROD}/messages?creator=e394bb4b-3d73-4c7a-96ff-9ff802e0f5d0`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const chatBody = (await page.textContent('body')).replace(/\s+/g,' ');
console.log(`  chat body: ${chatBody.slice(0, 350)}`);

// Find the message input
const textarea = page.locator('textarea, input[placeholder*=message i]').first();
const hasInput = await textarea.count();
console.log(`  message input present: ${hasInput > 0 ? 'yes' : 'no'}`);

if (hasInput) {
  const testMsg = `Playwright test ${Date.now()}`;
  await textarea.fill(testMsg);
  await page.waitForTimeout(500);

  // Click the icon-only send button (last button with svg, no text)
  const sendBtn = page.locator('button:has(svg)').last();
  await sendBtn.click();
  await page.waitForTimeout(3000);
  const afterBody = (await page.textContent('body')).replace(/\s+/g,' ');
  const success = /message sent/i.exec(afterBody);
  const fail = /send failed|insufficient|no entitlement|failed to send|need a subscription/i.exec(afterBody);
  console.log(`\n  send attempt result:`);
  console.log(`    success toast: ${success?.[0] || 'none'}`);
  console.log(`    failure toast: ${fail?.[0] || 'none'}`);
  console.log(`    page snippet: ${afterBody.slice(0, 250)}`);
  await page.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/Z_send_attempt.png' });
}

console.log(`\n  total http errors during chat+send: ${authedErrors.length}`);
for (const e of authedErrors.slice(0, 5)) console.log(`    ${e}`);

await browser.close();
console.log('\nDone.');
