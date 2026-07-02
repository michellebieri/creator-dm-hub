import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const PROD = 'https://creator-dm-hub.vercel.app';
const STATE = JSON.parse(readFileSync('/Users/michellebieri/Desktop/Coding/dmme/.qa/regression_state.json', 'utf8'));
const env = readFileSync('/Users/michellebieri/Desktop/Coding/dmme/.env', 'utf8');
const SUPA_URL = env.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const ANON = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(`${PROD}/auth`);
await page.locator('input[type=email]').first().fill(STATE.CUSTOMER.email);
await page.locator('input[type=password]').first().fill(STATE.CUSTOMER.password);
await page.locator('button[type=submit]').first().click();
await page.waitForTimeout(3000);
const jwt = await page.evaluate(() => {
  const raw = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))[0];
  return JSON.parse(localStorage.getItem(raw))?.access_token;
});
await browser.close();
const CUST_ID = 'f4175cd1-e1cf-45e5-ab8d-fc0ec2859c54';
const CREATOR_ID = '4c6c34bb-075b-4635-9b49-f40896adf32e';
const r = await fetch(`${SUPA_URL}/rest/v1/creator_subscriptions?customer_id=eq.${CUST_ID}&creator_id=eq.${CREATOR_ID}&select=id,status,tier_id,current_period_end&order=created_at.desc`,
  { headers: { apikey: ANON, Authorization: `Bearer ${jwt}` } });
console.log(JSON.stringify(JSON.parse(await r.text()), null, 2));
