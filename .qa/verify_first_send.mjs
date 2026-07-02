// Targeted regression: prove the FIRST-message bug is fixed.
// Use the CUSTOMER-ONLY fresh user (no creator role) → messages michelle
// (no prior conversation between this pair).

import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const PROD = 'https://creator-dm-hub.vercel.app';
const STATE = JSON.parse(readFileSync('/Users/michellebieri/Desktop/Coding/dmme/.qa/regression_state.json', 'utf8'));
// fresh CUSTOMER (no creator role) — wallet = $85 after Phase 2 (3 sends @ $5 to fresh creator)
const CUST = STATE.CUSTOMER;
const MICHELLE_USERNAME = 'Michellebieri';
const MICHELLE_ID = 'e394bb4b-3d73-4c7a-96ff-9ff802e0f5d0';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const errors = [];
page.on('response', async r => {
  if (r.status() >= 400 && new URL(r.url()).hostname.includes('supabase')) {
    let b = ''; try { b = (await r.text()).slice(0, 200); } catch {}
    errors.push(`${r.status()} ${new URL(r.url()).pathname.slice(0,40)} :: ${b.slice(0, 150)}`);
  }
});

console.log(`=== login fresh customer (${CUST.email}) ===`);
await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
await page.locator('input[type=email]').first().fill(CUST.email);
await page.locator('input[type=password]').first().fill(CUST.password);
await page.locator('button[type=submit]').first().click();
await page.waitForTimeout(3000);
console.log(`after login: ${page.url()}`);

console.log('\n=== wallet before ===');
await page.goto(`${PROD}/wallet`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const beforeBal = (await page.textContent('body')).match(/balance[^\d]*\$?(\d+\.\d{2})/i)?.[0];
console.log(`balance before: ${beforeBal}`);

console.log(`\n=== open NEW chat with michelle (no prior conversation between this pair) ===`);
errors.length = 0;
await page.goto(`${PROD}/${MICHELLE_USERNAME}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const chatBtn = page.getByRole('button', { name: /^chat$/i }).first();
if (await chatBtn.count() > 0) await chatBtn.click();
await page.waitForTimeout(2000);
console.log(`now on: ${page.url()}`);

console.log('\n=== send FIRST message ===');
const testMsg = `FIRST-SEND VERIFY ${Date.now()}`;
const textarea = page.locator('textarea, input[placeholder*=message i]').first();
if (await textarea.count() === 0) {
  console.log('NO TEXTAREA!');
  console.log('body:', (await page.textContent('body')).slice(0, 300));
  await browser.close(); process.exit(1);
}
await textarea.fill(testMsg);
await page.waitForTimeout(300);
const sendBtn = page.locator('button').filter({ has: page.locator('svg.lucide-send') }).first();
const wasDisabled = await sendBtn.isDisabled();
console.log(`send button disabled before click: ${wasDisabled}`);
await sendBtn.click();
await page.waitForTimeout(4000);

const after = (await page.textContent('body')).replace(/\s+/g,' ');
const successToast = /message sent/i.exec(after);
const failToast = /send failed|failed to send|insufficient/i.exec(after);
const msgVisible = after.includes(testMsg);

console.log(`\n--- RESULTS ---`);
console.log(`success toast:    ${successToast?.[0] || '✗ none'}`);
console.log(`failure toast:    ${failToast?.[0] || 'none'}`);
console.log(`message in DOM:   ${msgVisible ? '✓' : '✗'}`);

console.log('\n=== wallet after ===');
await page.goto(`${PROD}/wallet`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const afterBal = (await page.textContent('body')).match(/balance[^\d]*\$?(\d+\.\d{2})/i)?.[0];
console.log(`balance after:    ${afterBal}`);

console.log('\n=== inbox check ===');
await page.goto(`${PROD}/conversations`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const inboxBody = (await page.textContent('body')).replace(/\s+/g,' ');
const inboxHasMichelle = /michelle/i.test(inboxBody);
console.log(`inbox shows michelle: ${inboxHasMichelle ? '✓' : '✗'}`);
console.log(`inbox snippet: ${inboxBody.slice(0, 300)}`);

console.log(`\n=== refresh persistence ===`);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const reloadBody = (await page.textContent('body')).replace(/\s+/g,' ');
console.log(`after reload: ${reloadBody.slice(0, 250)}`);

console.log(`\nhttp errors during send: ${errors.length}`);
for (const e of errors.slice(0, 5)) console.log(`  ${e}`);

const success = successToast && msgVisible && parseFloat(afterBal.match(/\d+\.\d+/)[0]) < parseFloat(beforeBal.match(/\d+\.\d+/)[0]);
console.log(`\n${success ? '🎉 FIX VERIFIED — first message landed end-to-end' : '❌ STILL BROKEN'}`);

await browser.close();
