// Direct REST query as the customer to see what messages + unlockables return
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const PROD = 'https://creator-dm-hub.vercel.app';
const env = readFileSync('/Users/michellebieri/Desktop/Coding/dmme/.env', 'utf8');
const SUPA_URL = env.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const ANON = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];
const STATE = JSON.parse(readFileSync('/Users/michellebieri/Desktop/Coding/dmme/.qa/regression_state.json', 'utf8'));
const CUST = STATE.CUSTOMER;
const CREATOR_ID = '4c6c34bb-075b-4635-9b49-f40896adf32e';
const CUST_ID = 'f4175cd1-e1cf-45e5-ab8d-fc0ec2859c54';

// Login via UI to get JWT
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(`${PROD}/auth`, { waitUntil: 'networkidle' });
await page.locator('input[type=email]').first().fill(CUST.email);
await page.locator('input[type=password]').first().fill(CUST.password);
await page.locator('button[type=submit]').first().click();
await page.waitForTimeout(3000);
const jwt = await page.evaluate(() => {
  const raw = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))[0];
  return JSON.parse(localStorage.getItem(raw))?.access_token;
});
console.log('JWT acquired:', !!jwt);
await browser.close();

const head = { apikey: ANON, Authorization: `Bearer ${jwt}` };

// 1. Find the conversation
console.log('\n=== conversation lookup ===');
let r = await fetch(`${SUPA_URL}/rest/v1/conversations?creator_id=eq.${CREATOR_ID}&customer_id=eq.${CUST_ID}&select=id`, { headers: head });
const convs = await r.json();
console.log('status:', r.status, 'rows:', convs);
const convId = convs[0]?.id;

// 2. Fetch messages WITHOUT join
console.log('\n=== messages (raw) — last 5 ===');
r = await fetch(`${SUPA_URL}/rest/v1/messages?conversation_id=eq.${convId}&select=id,sender_id,content,message_type,created_at&order=created_at.desc&limit=5`, { headers: head });
const msgs = await r.json();
console.log('status:', r.status);
for (const m of msgs) console.log(`  [${m.message_type}] ${m.content.slice(0,40)} (id=${m.id.slice(0,8)})`);

// 3. Fetch messages WITH unlockable join (what useMessages does)
console.log('\n=== messages + unlockables embed ===');
r = await fetch(`${SUPA_URL}/rest/v1/messages?conversation_id=eq.${convId}&select=id,message_type,content,unlockables(*)&order=created_at.desc&limit=5`, { headers: head });
const msgsWithEmb = await r.json();
console.log('status:', r.status);
for (const m of msgsWithEmb) {
  console.log(`  [${m.message_type}] "${m.content.slice(0,40)}"`);
  console.log(`     unlockables: ${JSON.stringify(m.unlockables)}`);
}

// 4. Directly query unlockables for one of those messages
const unlockableMsg = msgs.find(m => m.message_type === 'unlockable');
if (unlockableMsg) {
  console.log(`\n=== direct unlockable lookup for message ${unlockableMsg.id.slice(0,8)} ===`);
  r = await fetch(`${SUPA_URL}/rest/v1/unlockables?message_id=eq.${unlockableMsg.id}&select=*`, { headers: head });
  const u = await r.json();
  console.log('status:', r.status, 'rows:', u.length);
  if (u.length > 0) console.log('  data:', JSON.stringify(u[0]).slice(0, 300));
  else console.log('  (zero rows — RLS denial likely)');
}

// 5. Try listing ALL unlockables to see if customer can SELECT any
console.log(`\n=== all unlockables visible to customer ===`);
r = await fetch(`${SUPA_URL}/rest/v1/unlockables?select=id,message_id,creator_id,media_type,price&limit=10`, { headers: head });
const all = await r.json();
console.log('status:', r.status, 'count:', Array.isArray(all) ? all.length : '?');
if (Array.isArray(all)) for (const u of all.slice(0, 3)) console.log(`  ${u.id.slice(0,8)} msg=${u.message_id.slice(0,8)} type=${u.media_type} $${u.price}`);
else console.log('  body:', JSON.stringify(all).slice(0, 300));
