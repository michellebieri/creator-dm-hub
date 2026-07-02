// Playwright smoke against public production pages — no auth needed.
import { chromium } from 'playwright';

const PROD = 'https://creator-dm-hub.vercel.app';
const MICHELLE_USERNAME = 'Michellebieri';   // case-insensitive lookup expected
const log = (...a) => console.log(...a);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`));

const results = [];
const check = async (name, fn) => {
  consoleErrors.length = 0;
  try {
    await fn();
    results.push({ name, ok: true, errors: [...consoleErrors] });
    log(`  ✓ ${name}${consoleErrors.length ? ` (with ${consoleErrors.length} console errors)` : ''}`);
  } catch (e) {
    results.push({ name, ok: false, error: e.message, errors: [...consoleErrors] });
    log(`  ✗ ${name} — ${e.message}`);
  }
};

log('=== Public-page Playwright smoke ===');
log(`prod: ${PROD}\n`);

await check('Landing page renders', async () => {
  await page.goto(PROD, { waitUntil: 'networkidle' });
  const title = await page.title();
  if (!title) throw new Error('Empty <title>');
  log(`    title: "${title}"`);
});

await check('Auth page renders', async () => {
  await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
  const hasEmailInput = await page.locator('input[type=email]').count();
  if (hasEmailInput === 0) throw new Error('No email input on /auth');
});

await check("Public creator profile page renders (michelle's)", async () => {
  await page.goto(`${PROD}/${MICHELLE_USERNAME}`, { waitUntil: 'networkidle' });
  const text = await page.content();
  if (!text.toLowerCase().includes('michelle')) throw new Error('michelle name not on page');
});

await check('Forgot password page renders', async () => {
  await page.goto(`${PROD}/forgot-password`, { waitUntil: 'networkidle' });
  const hasEmailInput = await page.locator('input[type=email]').count();
  if (hasEmailInput === 0) throw new Error('No email input on /forgot-password');
});

await check('Privacy & Terms pages render', async () => {
  await page.goto(`${PROD}/privacy-policy`, { waitUntil: 'domcontentloaded' });
  await page.goto(`${PROD}/terms-of-service`, { waitUntil: 'domcontentloaded' });
});

// ── Probe production bundle for which fixes are live ────────────────────────
log(`\n=== Production bundle fix signatures ===`);
await page.goto(PROD, { waitUntil: 'domcontentloaded' });
const bundleHref = await page.evaluate(() =>
  [...document.querySelectorAll('script[src]')]
    .map(s => s.getAttribute('src'))
    .find(s => /assets\/index-.*\.js/.test(s))
);
log(`  bundle: ${bundleHref}`);
const jsRes = await page.request.get(`${PROD}${bundleHref}`);
const js = await jsRes.text();

const sigs = {
  '5fcf06d (onboarding C1 fix)': !/role: ?["']creator["']/.test(js),
  '9b877d3 (onboarding diagnostic toast)': js.includes('Failed to complete setup: '),
  '6496075 (send-failure diagnostic toast)': js.includes('Send failed: '),
  '4292443 (pack-purchase diagnostic)': /context\??\.json\??\(/.test(js),
  '21c1b97 (C2 first-3-free RPC)': js.includes('send_first_three_free_message'),
};
for (const [name, ok] of Object.entries(sigs)) {
  log(`  ${ok ? '✓' : '✗'} ${name}`);
}

await browser.close();

log(`\n=== Summary ===`);
const failed = results.filter(r => !r.ok);
log(`  ${results.length - failed.length}/${results.length} public-page checks passed`);
if (failed.length) {
  log(`  failed: ${failed.map(f => f.name).join(', ')}`);
}
process.exit(failed.length ? 1 : 0);
