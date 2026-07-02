// Find the correct send-button selector
import { chromium } from 'playwright';
const PROD = 'https://creator-dm-hub.vercel.app';
const STAMP = '1778760223721';
const USER = { email: `qa-cust-${STAMP}@inboxbear.com`, password: `QaTest!${STAMP}` };
const MICHELLE = 'e394bb4b-3d73-4c7a-96ff-9ff802e0f5d0';

const b = await chromium.launch();
const ctx = await b.newContext();
const page = await ctx.newPage();

await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
await page.locator('input[type=email]').first().fill(USER.email);
await page.locator('input[type=password]').first().fill(USER.password);
await page.locator('button[type=submit]').first().click();
await page.waitForTimeout(3000);
await page.goto(`${PROD}/messages?creator=${MICHELLE}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Find the textarea (message input)
const textarea = page.locator('textarea, input[placeholder*=message i]').first();
console.log('textareas:', await textarea.count());

// Get all buttons + their aria-labels / inner text / nearby icons
const buttons = await page.locator('button').evaluateAll(btns =>
  btns.map(b => ({
    text: b.textContent?.trim()?.slice(0, 30) || '',
    ariaLabel: b.getAttribute('aria-label'),
    title: b.getAttribute('title'),
    type: b.getAttribute('type'),
    disabled: b.disabled,
    svgClass: b.querySelector('svg')?.getAttribute('class') || null,
    bbox: b.getBoundingClientRect().toJSON(),
    classNames: b.className.slice(0, 100),
  }))
);
console.log(`Total buttons: ${buttons.length}`);

// Show buttons positioned near the textarea (bottom of page)
const taBox = await textarea.boundingBox();
console.log('textarea bbox:', taBox);
const near = buttons.filter(b => Math.abs(b.bbox.y - taBox.y) < 80);
console.log(`\nButtons near textarea (within 80px Y):`);
for (const b of near) console.log(JSON.stringify(b).slice(0, 200));

await b.close();
