// Capture full request headers on the failing profile lookups
import { chromium } from 'playwright';
const PROD = 'https://creator-dm-hub.vercel.app';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const captured = [];
page.on('request', req => {
  if (req.url().includes('/rest/v1/profiles')) {
    captured.push({
      url: req.url(),
      method: req.method(),
      headers: req.headers(),
      postData: req.postData(),
    });
  }
});

const responses = [];
page.on('response', async (res) => {
  if (res.url().includes('/rest/v1/profiles')) {
    let body = '';
    try { body = await res.text(); } catch {}
    responses.push({ url: res.url(), status: res.status(), body: body.slice(0, 400) });
  }
});

await page.goto(`${PROD}/Michellebieri`, { waitUntil: 'networkidle', timeout: 30000 });

console.log('=== Captured /rest/v1/profiles requests ===\n');
for (let i = 0; i < captured.length; i++) {
  const r = captured[i];
  console.log(`#${i+1} ${r.method} ${r.url}`);
  console.log(`    apikey: ${r.headers.apikey ? r.headers.apikey.slice(0,30)+'...' : 'MISSING'}`);
  console.log(`    authorization: ${r.headers.authorization ? r.headers.authorization.slice(0,30)+'...' : 'MISSING'}`);
}

console.log('\n=== Response details ===\n');
for (let i = 0; i < responses.length; i++) {
  console.log(`#${i+1} ${responses[i].status} ${responses[i].url}`);
  console.log(`    body: ${responses[i].body}`);
}

// Also dump what the supabase client thinks its URL/key are
const env = await page.evaluate(() => ({
  // try to find the supabase client globally
  pageHtml_anonKeyHint: !!document.querySelector('script[src*="supabase"]'),
}));
console.log('\n=== Page env hints ===');
console.log(env);

await browser.close();
