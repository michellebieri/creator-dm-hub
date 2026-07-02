// Aggressive UI exploration as a logged-in customer.
// Visits every major customer-facing page, captures errors, surfaces issues.

import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'fs';

const PROD = 'https://creator-dm-hub.vercel.app';
const SCREEN_DIR = '/Users/michellebieri/Desktop/Coding/dmme/.qa/screens';
if (!existsSync(SCREEN_DIR)) mkdirSync(SCREEN_DIR, { recursive: true });

const STAMP = '1778760223721';
const CUST = {
  email: `qa-cust-${STAMP}@inboxbear.com`,
  password: `QaTest!${STAMP}`,
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const allFindings = [];
const eventsByPage = {};
let currentPage = '';

page.on('console', m => {
  if (m.type() === 'error') {
    eventsByPage[currentPage] ??= [];
    eventsByPage[currentPage].push({ type: 'console', text: m.text().slice(0, 250) });
  }
});
page.on('response', async (r) => {
  if (r.status() >= 400) {
    let body = '';
    try { body = (await r.text()).slice(0, 250); } catch {}
    const u = new URL(r.url());
    if (u.hostname.includes('supabase')) {
      eventsByPage[currentPage] ??= [];
      eventsByPage[currentPage].push({
        type: 'http',
        status: r.status(),
        path: u.pathname + u.search.slice(0, 100),
        body: body.slice(0, 250),
      });
    }
  }
});

// Login
console.log('=== Login ===');
await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
await page.locator('input[type=email]').first().fill(CUST.email);
await page.locator('input[type=password]').first().fill(CUST.password);
await page.locator('button[type=submit]').first().click();
await page.waitForTimeout(3000);
if (page.url().includes('/auth')) {
  console.log('LOGIN FAILED. Aborting.');
  await browser.close();
  process.exit(1);
}
console.log('Login OK ->', page.url());

// Visit every major page; capture content + errors
const pages = [
  { path: '/', label: 'home_loggedin' },
  { path: '/dashboard', label: 'dashboard' },
  { path: '/conversations', label: 'conversations' },
  { path: '/wallet', label: 'wallet' },
  { path: '/library', label: 'library' },
  { path: '/purchase-history', label: 'purchase_history' },
  { path: '/subscriptions', label: 'subscriptions' },
  { path: '/payment-methods', label: 'payment_methods' },
  { path: '/notifications', label: 'notifications' },
  { path: '/notification-settings', label: 'notification_settings' },
  { path: '/profile', label: 'profile_settings' },
  { path: '/account-settings', label: 'account_settings' },
  { path: '/privacy-settings', label: 'privacy_settings' },
  { path: '/following', label: 'following' },
  { path: '/vault', label: 'vault' },
  { path: '/more', label: 'more' },
  { path: '/Michellebieri', label: 'michelle_profile' },
  { path: '/messages?creator=e394bb4b-3d73-4c7a-96ff-9ff802e0f5d0', label: 'chat_with_michelle' },
  { path: '/wishlist', label: 'wishlist' },
  { path: '/blocked-users', label: 'blocked_users' },
  { path: '/activity-feed', label: 'activity_feed' },
  { path: '/search', label: 'search' },
  { path: '/sessions', label: 'sessions' },
];

for (const p of pages) {
  currentPage = p.label;
  console.log(`\n--- ${p.label} (${p.path}) ---`);
  eventsByPage[currentPage] ??= [];
  try {
    await page.goto(`${PROD}${p.path}`, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${SCREEN_DIR}/X_${p.label}.png` });
    const body = (await page.textContent('body')).replace(/\s+/g, ' ');
    const blank = body.length < 50;
    const errToast = body.match(/error|failed|not found|cannot/i)?.[0] || null;
    const errCount = eventsByPage[currentPage].length;
    const finalUrl = page.url();
    allFindings.push({
      page: p.label, path: p.path, finalUrl, blank, errToast,
      errCount, snippet: body.slice(0, 180),
    });
    console.log(`  url: ${finalUrl}`);
    console.log(`  errors: ${errCount}`);
    console.log(`  snippet: ${body.slice(0, 150)}`);
    if (errCount > 0) {
      for (const e of eventsByPage[currentPage].slice(0, 3)) {
        console.log(`    [${e.type}] ${e.status || ''} ${e.path || ''}  body: ${e.body || e.text}`);
      }
    }
  } catch (err) {
    console.log(`  NAV ERROR: ${err.message}`);
    allFindings.push({ page: p.label, path: p.path, navError: err.message });
  }
}

await browser.close();

// Summary
console.log(`\n\n═══ EXPLORATION SUMMARY ═══`);
console.log(`Pages visited: ${pages.length}`);
const withErrors = allFindings.filter(f => f.errCount > 0);
console.log(`Pages with backend errors: ${withErrors.length}`);
console.log(`\nPages with errors (path → unique-error-paths):`);
for (const p of withErrors) {
  const events = eventsByPage[p.page];
  const uniquePaths = [...new Set(events.map(e => e.path || e.type))];
  console.log(`  ${p.page} (${p.errCount}): ${uniquePaths.slice(0, 5).join('  |  ')}`);
}
writeFileSync(`${SCREEN_DIR}/_explore.json`, JSON.stringify({ findings: allFindings, eventsByPage }, null, 2));
console.log(`\nFull results: ${SCREEN_DIR}/_explore.json`);
