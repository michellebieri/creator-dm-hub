// Focused debug of the chat-send issue (chat page rendered Upload Content)
import { chromium } from 'playwright';

const PROD = 'https://creator-dm-hub.vercel.app';
const STAMP = '1778760223721';
const USER = { email: `qa-cust-${STAMP}@inboxbear.com`, password: `QaTest!${STAMP}` };
const MICHELLE_ID = 'e394bb4b-3d73-4c7a-96ff-9ff802e0f5d0';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') console.log(`[browser console error] ${m.text().slice(0,200)}`); });
page.on('framenavigated', f => { if (f === page.mainFrame()) console.log(`[navigated] ${f.url()}`); });

// Login
console.log('=== login ===');
await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
await page.locator('input[type=email]').first().fill(USER.email);
await page.locator('input[type=password]').first().fill(USER.password);
await page.locator('button[type=submit]').first().click();
await page.waitForTimeout(3000);
console.log(`after login: ${page.url()}`);

// Navigate to chat
console.log('\n=== navigate to chat ===');
await page.goto(`${PROD}/messages?creator=${MICHELLE_ID}`, { waitUntil: 'networkidle' });
console.log(`after goto: ${page.url()}`);
await page.waitForTimeout(2000);
console.log(`after wait: ${page.url()}`);

// Capture body / titles / what page rendered
const title = await page.title();
const h1 = await page.locator('h1, h2, h3').allTextContents();
const body = (await page.textContent('body')).replace(/\s+/g,' ');
console.log(`\npage title: "${title}"`);
console.log(`headings: ${JSON.stringify(h1.slice(0,5))}`);
console.log(`body snippet: ${body.slice(0, 500)}`);

// Is there a message input?
const textareaCount = await page.locator('textarea').count();
const messageInputCount = await page.locator('input[placeholder*=message i]').count();
console.log(`\ntextareas on page: ${textareaCount}`);
console.log(`message-placeholder inputs: ${messageInputCount}`);

// Try clicking the right side nav to "Messages" to see where it goes
const messagesLink = page.getByRole('link', { name: /messages/i }).first();
if (await messagesLink.count() > 0) {
  console.log('\nclicking Messages nav link...');
  await messagesLink.click();
  await page.waitForTimeout(2000);
  console.log(`after Messages click: ${page.url()}`);
  const body2 = (await page.textContent('body')).replace(/\s+/g,' ');
  console.log(`body now: ${body2.slice(0, 300)}`);
}

await page.screenshot({ path: '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens/D_chat_debug.png' });
await browser.close();
