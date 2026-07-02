// Capture console errors on key pages for diagnostic.
import { chromium } from 'playwright';
const PROD = 'https://creator-dm-hub.vercel.app';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const events = [];
page.on('console', m => {
  if (m.type() === 'error' || m.type() === 'warning') {
    events.push({ type: m.type(), text: m.text() });
  }
});
page.on('pageerror', e => events.push({ type: 'pageerror', text: e.message + ' | stack: ' + (e.stack||'').split('\n').slice(0,3).join('  ') }));
page.on('requestfailed', req => events.push({ type: 'requestfailed', text: `${req.method()} ${req.url()} :: ${req.failure()?.errorText}` }));
page.on('response', res => {
  if (res.status() >= 400) {
    events.push({ type: 'http-error', text: `HTTP ${res.status()} ${res.url()}` });
  }
});

const pages = [
  { path: '/', name: 'Landing' },
  { path: '/Michellebieri', name: "michelle's profile" },
  { path: '/auth', name: 'Auth' },
  { path: '/forgot-password', name: 'Forgot password' },
];

for (const p of pages) {
  events.length = 0;
  console.log(`\n=== ${p.name} (${p.path}) ===`);
  try {
    await page.goto(`${PROD}${p.path}`, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log(`  navigation error: ${e.message}`);
  }
  if (events.length === 0) {
    console.log('  (clean — no errors or warnings)');
  } else {
    for (const ev of events) {
      console.log(`  [${ev.type}] ${ev.text.slice(0, 500)}`);
    }
  }
}

await browser.close();
