// Test the full unlock-purchase flow: customer clicks Unlock, RPC deducts
// wallet, customer sees media (or doesn't because bucket is private).

import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const PROD = 'https://creator-dm-hub.vercel.app';
const STATE = JSON.parse(readFileSync('/Users/michellebieri/Desktop/Coding/dmme/.qa/regression_state.json', 'utf8'));
const CUST = STATE.CUSTOMER;
const CREATOR_ID = '4c6c34bb-075b-4635-9b49-f40896adf32e';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const errors = [];
page.on('response', async r => {
  if (r.status() >= 400) {
    const u = new URL(r.url());
    let b = ''; try { b = (await r.text()).slice(0, 200); } catch {}
    errors.push(`${r.status()} ${u.hostname}${u.pathname.slice(0,60)} :: ${b.slice(0, 200)}`);
  }
});

console.log('=== login customer ===');
await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
await page.locator('input[type=email]').first().fill(CUST.email);
await page.locator('input[type=password]').first().fill(CUST.password);
await page.locator('button[type=submit]').first().click();
await page.waitForTimeout(3000);

console.log('\n=== open chat with creator ===');
await page.goto(`${PROD}/messages?creator=${CREATOR_ID}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/UP_01_chat.png' });
const beforeBody = (await page.textContent('body')).replace(/\s+/g, ' ');
const beforeBal = beforeBody.match(/Balance[^\d]*\$?(\d+\.\d{2})/i)?.[0];
console.log('balance before:', beforeBal);
console.log('snippet:', beforeBody.slice(0, 300));

console.log('\n=== look for Unlock button ===');
const unlockBtn = page.getByRole('button', { name: /unlock for/i }).first();
const found = await unlockBtn.count();
console.log('unlock buttons found:', found);
if (found === 0) {
  console.log('NO UNLOCK BUTTON — checking what locked cards look like');
  const lockedTexts = await page.locator('text=/premium content|locked content/i').allTextContents();
  console.log('locked-card texts:', lockedTexts);
  await browser.close();
  process.exit(1);
}

console.log('\n=== click Unlock ===');
errors.length = 0;
await unlockBtn.click();
await page.waitForTimeout(5000);
await page.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/UP_02_after_unlock.png' });

const after = (await page.textContent('body')).replace(/\s+/g, ' ');
console.log('\n--- AFTER UNLOCK ---');
console.log('snippet (search for content):', after.slice(0, 500));

const afterBal = after.match(/Balance[^\d]*\$?(\d+\.\d{2})/i)?.[0];
console.log('balance after:', afterBal);

const stillLocked = /unlock for/i.test(after);
console.log('still shows "Unlock for":', stillLocked);

console.log('\n=== check for <img> with broken/working src ===');
const imgs = await page.locator('img[src*="unlockables"]').evaluateAll(els =>
  els.map(e => ({
    src: e.getAttribute('src'),
    complete: e.complete,
    naturalWidth: e.naturalWidth,
  }))
);
console.log(`unlockable <img> count: ${imgs.length}`);
for (const img of imgs.slice(0, 3)) {
  console.log(`  src: ${img.src?.slice(0, 100)}`);
  console.log(`  loaded: ${img.complete}, naturalWidth: ${img.naturalWidth} (0 = broken)`);
}

console.log(`\nhttp errors total: ${errors.length}`);
for (const e of errors.slice(0, 10)) console.log('  ' + e);

await browser.close();
