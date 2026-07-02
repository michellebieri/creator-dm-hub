// Proper paid-message send test with correct selectors.
import { chromium } from 'playwright';
const PROD = 'https://creator-dm-hub.vercel.app';
const STAMP = '1778760223721';
const USER = { email: `qa-cust-${STAMP}@inboxbear.com`, password: `QaTest!${STAMP}` };
const MICHELLE = 'e394bb4b-3d73-4c7a-96ff-9ff802e0f5d0';

const b = await chromium.launch();
const ctx = await b.newContext();
const page = await ctx.newPage();

const errors = [];
page.on('response', async r => {
  if (r.status() >= 400 && new URL(r.url()).hostname.includes('supabase')) {
    let body = ''; try { body = (await r.text()).slice(0, 200); } catch {}
    errors.push(`${r.status()} ${new URL(r.url()).pathname.slice(0,40)} :: ${body.slice(0, 200)}`);
  }
});

console.log('=== login ===');
await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
await page.locator('input[type=email]').first().fill(USER.email);
await page.locator('input[type=password]').first().fill(USER.password);
await page.locator('button[type=submit]').first().click();
await page.waitForTimeout(3000);

console.log('=== wallet check ===');
await page.goto(`${PROD}/wallet`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const walletBody = (await page.textContent('body')).replace(/\s+/g,' ');
const bal = walletBody.match(/balance[^\d]*\$?(\d+\.\d{2})/i);
console.log(`wallet balance: ${bal?.[0] || '<not found>'}`);
console.log(`balance value: ${bal ? parseFloat(bal[1]) : 'unknown'}`);

console.log('\n=== chat with michelle ===');
errors.length = 0;
await page.goto(`${PROD}/messages?creator=${MICHELLE}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const textarea = page.locator('textarea, input[placeholder*=message i]').first();
if (await textarea.count() === 0) {
  console.log('NO TEXTAREA — page might have redirected.');
  console.log('url:', page.url());
  console.log('body:', (await page.textContent('body')).slice(0, 300));
  await b.close();
  process.exit(1);
}

const testMsg = `Playwright E2E ${Date.now()}`;
console.log(`typing message: "${testMsg}"`);
await textarea.fill(testMsg);
await page.waitForTimeout(500);

// Find the SEND button (paper-plane icon, lucide-send)
const sendBtn = page.locator('button').filter({ has: page.locator('svg.lucide-send') }).first();
console.log(`send buttons found: ${await sendBtn.count()}`);
console.log(`send button disabled: ${await sendBtn.isDisabled()}`);

if (await sendBtn.isDisabled()) {
  console.log('SEND IS DISABLED. Investigating why...');
  // Look at message + balance state
  const body = (await page.textContent('body')).replace(/\s+/g,' ');
  const balanceSnippet = body.match(/Balance[^$]*\$\d+\.\d{2}/i);
  console.log(`balance snippet: ${balanceSnippet?.[0]}`);
  await page.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/S_send_disabled.png' });
  await b.close();
  process.exit(1);
}

console.log('clicking send...');
await sendBtn.click();
await page.waitForTimeout(4000);
await page.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/S_after_send.png' });

const after = (await page.textContent('body')).replace(/\s+/g,' ');
const success = /message sent/i.exec(after);
const fail = /send failed|insufficient|failed to send/i.exec(after);
const msgInPage = after.includes(testMsg);

console.log(`\nsuccess toast: ${success?.[0] || 'none'}`);
console.log(`failure toast: ${fail?.[0] || 'none'}`);
console.log(`message visible in page: ${msgInPage}`);
console.log(`http errors during send: ${errors.length}`);
for (const e of errors.slice(0, 5)) console.log(`  ${e}`);

console.log('\n=== verify wallet decreased ===');
await page.goto(`${PROD}/wallet`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const newWalletBody = (await page.textContent('body')).replace(/\s+/g,' ');
const newBal = newWalletBody.match(/balance[^\d]*\$?(\d+\.\d{2})/i);
console.log(`wallet after send: ${newBal?.[0] || '<not found>'}`);

console.log('\n=== verify inbox shows conversation ===');
await page.goto(`${PROD}/conversations`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const inboxBody = (await page.textContent('body')).replace(/\s+/g,' ');
const empty = /no messages yet/i.test(inboxBody);
console.log(`inbox empty: ${empty}`);
console.log(`inbox snippet: ${inboxBody.slice(0, 250)}`);

await b.close();
