# DMME — Autonomous Execution Brief for Claude Code

**For:** Claude Code, running in a terminal at the DMME repo.
**Prepared by:** Cowork (debugging session, 22 May 2026).
**Goal:** Execute this brief end-to-end with no human ping-pong. Diagnose and fix the AI auto-reply, then work the backlog. Stop only at the explicitly blocked items or if a guardrail is hit.

You have not seen the prior conversation. Everything you need is in this file.

---

## 0. Context — what DMME is and where things stand

DMME is a creator monetization platform (general creator messaging — fitness/lifestyle/suggestive, **not** explicit; treat it like Fanhouse/Passes). Fans pay to message creators; an AI auto-replies on the creator's behalf. Stack: React + TypeScript frontend, Supabase (Postgres + Edge Functions + Auth), Stripe, deployed on Vercel.

- **Repo:** `/Users/michellebieri/Desktop/Coding/dmme`
- **Supabase project ref:** `jhzcmdsaajvftjbhdunt` (URL `jhzcmdsaajvftjbhdunt.supabase.co`)
- **Branch in Supabase:** `main` / **PRODUCTION**. You are touching live infrastructure — read Section 1 (guardrails) before doing anything.

### What was already fixed today (do not redo)
- Root cause of an earlier outage: the 14 May permission-hardening migrations granted table access to `authenticated`/`anon` but omitted `service_role`. `service_role` bypasses RLS but still needs explicit GRANTs. Every edge-function query was failing "permission denied."
- GRANTs were run for `service_role` on 8 tables (`conversations`, `messages`, `creator_ai_personas`, `profiles`, `ai_draft_messages`, `auto_replies`, etc.).
- Two migration files now track this: `supabase/migrations/20260519000001_fix_service_role_grants.sql` and `20260519000002_fix_service_role_grants_profiles.sql`.
- A `creator_ai_personas` row exists for the test creator (`michellebieri@gmx.ch`): `is_enabled = true`, `mode = 'auto'`, `auto_reply_delay_minutes = 0`.
- `ANTHROPIC_API_KEY` is confirmed set in Supabase Edge Function secrets.

### The remaining symptom
`check-auto-reply` is invoked, returns **HTTP 200 every time**, but **no reply message appears** in the conversation. Cause not yet confirmed — Section 3 makes you diagnose it deterministically.

### Test conversation ID
`338010b6-4921-4856-8384-9a42ef66f2ff` — use this everywhere below.

---

## 1. Autonomy guardrails — READ FIRST

**You MAY do autonomously:**
- Edit any file in the repo.
- Deploy the `check-auto-reply` edge function (`supabase functions deploy check-auto-reply`).
- Run `SELECT` queries and **additive, idempotent** SQL (`GRANT`, `CREATE ... IF NOT EXISTS`) against the database.
- Create new migration files under `supabase/migrations/`.
- Insert and then delete **your own clearly-marked test rows** for end-to-end testing.
- `npm run build`, type-checks, lint.
- `git add` / `git commit` on a feature branch.

**You MUST NOT — stop and leave for Michelle:**
- Rotate Stripe keys.
- Run the live $1 Stripe payment test (needs a real card).
- **Apply** the proactive-outreach `pg_cron` migration. Write the file; do **not** run it. (It sends real messages to real fans — needs Michelle's sign-off. See Task 6.)
- Any `DROP`, `TRUNCATE`, destructive `ALTER`, or `DELETE` other than your own test rows (delete those by explicit `id` only).
- `git push` to `main`. Push a feature branch only; do not merge.
- `force-push` anything.

**Where changes go live:**
- The edge-function fix goes live the moment you `supabase functions deploy` — that is intended; it is the fix.
- Frontend changes do **not** go live until the branch is merged to `main` and Vercel rebuilds. That is fine and safer — leave the merge to Michelle.

**Stop conditions — halt and report instead of guessing:**
- The Supabase CLI is not linked / not authenticated (Section 2).
- A diagnostic in Section 3 produces a result not covered by the decision tree.
- `npm run build` fails after your change and you cannot resolve it in two attempts.
- Any guardrail above would be crossed.

**Commit discipline:** one commit per task, clear message, on branch `fix/auto-reply-and-backlog`. This lets Michelle review and revert per-fix.

---

## 2. Step 0 — verify the environment before touching anything

Run these and confirm before proceeding. If any fails, **stop and report**.

```bash
cd /Users/michellebieri/Desktop/Coding/dmme
git status                       # working tree state; note the current branch
supabase projects list           # confirm jhzcmdsaajvftjbhdunt is linked
supabase functions list --project-ref jhzcmdsaajvftjbhdunt
cat supabase/config.toml | grep -A3 'check-auto-reply'   # note verify_jwt setting
ls supabase/migrations | tail -5
```

Identify how to run SQL. Preference order:
1. Supabase CLI against the linked project (`supabase db ...` / `psql` with the pooler connection string).
2. The DB connection string in the repo `.env` / `.env.local` (look for `DATABASE_URL` / `SUPABASE_DB_URL`).
3. If neither works, **stop and report** — do not improvise.

Identify the keys you will need (from repo `.env*`): the `anon` key (for invoking the function via curl) and the `service_role` key if present. Do not print full secret values in your report — reference them as "present" / "absent."

Create the working branch:
```bash
git checkout -b fix/auto-reply-and-backlog
```

---

## 3. Task 1 — Fix the AI auto-reply (PRIORITY; this is the gate)

The edge function is `supabase/functions/check-auto-reply/index.ts`. The known logic (line numbers approximate — read the real file):

```
~L90   const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
~L92   lookup conversation by id -> {creator_id, customer_id}; 404 if missing
~L99   lookup creator_ai_personas by creator_id, is_enabled=true (.maybeSingle())
~L102  if no persona -> handleLegacyAutoReply(...)  [legacy path has nothing]
~L105  recentCutoff = now - delay_minutes*60000; skip if a recent reply exists
~L114  fetch creatorProfile, fanProfile, fanTxns in parallel
~L129  read ANTHROPIC_API_KEY; call Anthropic
~L147  if persona.mode==='draft' -> insert ai_draft_messages
~L150  await supabase.from('messages').insert({conversation_id, sender_id: creatorId, content: aiReply})
~L152  return { triggered: true, mode: 'auto' }
```

### 3a. Diagnose — get ground truth (run all of these, record output)

```sql
-- (1) The conversation row
select id, creator_id, customer_id, created_at
from conversations
where id = '338010b6-4921-4856-8384-9a42ef66f2ff';

-- (2) Does the conversation's creator have an ENABLED persona?
select p.*
from creator_ai_personas p
where p.creator_id = (
  select creator_id from conversations
  where id = '338010b6-4921-4856-8384-9a42ef66f2ff'
);

-- (3) Messages currently in the conversation
select id, sender_id, content, created_at
from messages
where conversation_id = '338010b6-4921-4856-8384-9a42ef66f2ff'
order by created_at desc limit 10;

-- (4) FULL messages table schema — this is the key diagnostic
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'messages'
order by ordinal_position;

-- (5) Any enum types used by messages columns (e.g. message_type/sender_type)
select t.typname, e.enumlabel
from pg_type t
join pg_enum e on e.enumtypid = t.oid
order by t.typname, e.enumsortorder;

-- (6) service_role grants on messages (should already be fixed)
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'messages';

-- (7) Realtime publication membership for messages
select * from pg_publication_tables
where pubname = 'supabase_realtime' and tablename = 'messages';
```

Invoke the function fresh and capture the **full** response body (use the verify_jwt setting from Section 2 to decide if a JWT is needed):

```bash
# Option A — CLI
supabase functions invoke check-auto-reply \
  --project-ref jhzcmdsaajvftjbhdunt \
  --body '{"conversationId":"338010b6-4921-4856-8384-9a42ef66f2ff"}'

# Option B — curl (use the anon key from repo .env)
curl -i -X POST \
  'https://jhzcmdsaajvftjbhdunt.supabase.co/functions/v1/check-auto-reply' \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H 'Content-Type: application/json' \
  -d '{"conversationId":"338010b6-4921-4856-8384-9a42ef66f2ff"}'
```

### 3b. Decision tree — interpret the results

- **Query (2) returns no row** → the conversation's `creator_id` does not match any enabled persona. The function falls into `handleLegacyAutoReply` and silently does nothing. Fix: confirm which creator owns this conversation and ensure that creator has an enabled persona row (`is_enabled=true`, `mode='auto'`). Do not assume it is Michelle's — verify the IDs match.
- **Response body `{triggered:false, reason:'recent_reply'}`** → the delay guard is blocking. With `delay=0` it should not; read `index.ts` ~L105-110 and confirm the `recentReply` query filters on the **creator's** messages (`sender_id = creatorId`), not the fan's inbound message. Fix the filter if wrong.
- **Response body `{triggered:false, reason:'ai_error'}` / `'empty_ai_response'`** → the Anthropic call is failing or returning empty. Check the model string is current and the response parsing matches the API shape. Add a guard so an empty `aiReply` returns a clear reason instead of inserting blank.
- **Response body `{triggered:true,...}` but query (3) shows NO new creator message** → **the prime suspect, see 3c.**
- **Response body `{triggered:true}` AND query (3) shows the reply row exists** → backend is fine; the bug is frontend realtime. See 3d.

### 3c. Prime suspect — swallowed insert error (fix this regardless)

Line ~150 is:
```ts
await supabase.from('messages').insert({ conversation_id, sender_id: creatorId, content: aiReply });
return { triggered: true, mode: 'auto' };
```
Two defects:
1. The insert supplies only 3 columns. If `messages` has other `NOT NULL` columns with no default (candidates: `message_type`, `sender_type`, `is_read`, `customer_id`, `read_at`), the insert **fails**.
2. The result is never captured, so the function returns `triggered:true` even when the insert failed — hence "200, no reply."

**Fix.** Using the schema from query (4)/(5), populate every required column with valid values, capture the error, and return honestly. Match the real variable names and the file's actual `Response` return pattern:

```ts
const { error: insertError } = await supabase.from('messages').insert({
  conversation_id: conversationId,
  sender_id: creatorId,
  content: aiReply,
  // Add EVERY not-null/no-default column from query (4). Use enum values from query (5).
  // Likely needed — confirm names/values against the schema dump:
  message_type: 'text',
  sender_type: 'creator',
  is_read: false,
});

if (insertError) {
  console.error('[check-auto-reply] messages insert failed:', insertError);
  return new Response(
    JSON.stringify({ triggered: false, reason: 'insert_failed', detail: insertError.message }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
```

While you are in the file, do the same `{ error }` capture + check on **every** other write (the `ai_draft_messages` insert at ~L147) so future failures are not silent.

### 3d. Realtime (only if 3c lands the row but the UI still does not show it)

If query (7) returns no row, `messages` is not in the realtime publication — add it:
```sql
alter publication supabase_realtime add table public.messages;
```
Also confirm `authenticated` has `SELECT` on `messages` (the 14 May hardening may have revoked it):
```sql
grant select on public.messages to authenticated;
```
Then check the frontend subscription (search the repo for `.channel(` / `postgres_changes` / `messages`) actually subscribes to inserts on `messages` filtered by `conversation_id`.

### 3e. Deploy + autonomous end-to-end test (no human, no "fan T" account needed)

```bash
supabase functions deploy check-auto-reply --project-ref jhzcmdsaajvftjbhdunt
```

Then simulate a fan message and verify a reply lands:
```sql
-- Insert a marked test inbound message AS THE FAN (customer_id from query (1)).
-- Include every required column per the schema dump.
insert into messages (conversation_id, sender_id, content, message_type, sender_type, is_read)
values ('338010b6-4921-4856-8384-9a42ef66f2ff',
        '<customer_id from query (1)>',
        'TEST_AUTOREPLY_PROBE_22MAY please ignore',
        'text', 'fan', false)
returning id;
```
Re-invoke the function (3a), wait a few seconds, then:
```sql
select id, sender_id, content, created_at
from messages
where conversation_id = '338010b6-4921-4856-8384-9a42ef66f2ff'
  and created_at > now() - interval '3 minutes'
order by created_at desc;
```
**Pass:** a new row exists with `sender_id` = the creator's id and non-empty `content`.

**Cleanup — delete only your own rows, by explicit id:**
```sql
delete from messages where id in ('<probe id>', '<ai test reply id>');
```

### 3f. Commit
```bash
git add supabase/functions/check-auto-reply/index.ts supabase/migrations/
git commit -m "fix(auto-reply): capture messages insert error, populate required columns"
```

---

## 4. Task 2 — AI disclosure line (do right after Task 1; cheap, low risk)

Fans pay believing they message a person; AI replying as the creator with no disclosure is a deceptive-practices and Stripe-ToS exposure. Add one quiet line of disclosure in the **fan-facing** chat view — near the message thread or compose box — e.g. *"Replies may be AI-assisted."* Find the chat/conversation component (search `conversation` / `MessageThread` / `ChatWindow`). Keep it subtle but present. Commit:
```bash
git commit -am "feat(chat): add AI-assisted reply disclosure to fan chat view"
```

---

## 5. Task 3 — B-NAV: expose `/settings/messaging`

The page at `/settings/messaging` (price per message, `first_three_free` toggle) exists but has no navigation link — unreachable from the UI. Find the settings navigation component (search for other `/settings/` route links, e.g. `/settings/profile`). Add a link to `/settings/messaging` matching the existing pattern (label e.g. "Messaging"). Verify the route is registered in the router. Commit separately.

---

## 6. Task 4 — B13: hide bottom nav for logged-out users

The bottom navigation renders for logged-out visitors on the landing page. Find the bottom-nav component; wrap its render in the existing auth check (search for the auth/session hook used elsewhere, e.g. `useAuth` / `useSession` / `user`). Render `null` when there is no authenticated user. Commit separately.

---

## 7. Task 5 — B12: fix CreatorOnboarding display-name pre-fill

In the CreatorOnboarding component the display-name field should pre-fill but does not. Likely causes: initial state set before the profile/auth data has loaded, or it reads from the wrong source. Find `CreatorOnboarding`, trace where the display name should come from (auth user metadata or the `profiles` row), and make the field initialize from it (use an effect that runs once the profile resolves, or a controlled default keyed on load). Verify with `npm run build`. Commit separately.

---

## 8. Task 6 — Proactive outreach cron (WRITE the migration, DO NOT apply it)

`ai-proactive-outreach` edge function exists but no `pg_cron` job calls it. **Write** a migration file (`supabase/migrations/<timestamp>_proactive_outreach_cron.sql`) that schedules it via `pg_cron` + `pg_net` (`cron.schedule` + `net.http_post` to the function URL). Do **not** apply it.

Reason it is held: (1) auto-reply must be confirmed working first; (2) **open question for Michelle** — if fans are charged per message, does an AI-*initiated* outreach message charge the fan? AI generating charges the fan did not initiate is a chargeback magnet and a consent problem. Flag this explicitly in your final report; do not enable proactive outreach until it is answered.

---

## 9. Task 7 — Draft messages review UI (largest item; do last)

When a persona has `mode='draft'`, the function writes to `ai_draft_messages` but there is no UI for the creator to review/approve/edit/send those drafts. Build a creator-facing view that lists pending drafts for the creator's conversations with approve (→ insert into `messages` + mark draft handled), edit, and discard actions. Read the `ai_draft_messages` schema first. This is a real feature, not a patch — scope it, build it, `npm run build`, commit. If it is large enough to risk the smaller fixes, commit Tasks 1–6 first so they are safe.

---

## 10. Explicitly blocked — needs Michelle (do NOT attempt)

- **Live $1 Stripe payment test** — needs a real card.
- **Stripe secret key rotation** — done in the Stripe dashboard, then the env var updated.

Note: the content-type question is settled — DMME is SFW-to-suggestive with no explicit nudity/porn, which is acceptable for Stripe. No processor change is needed.

---

## 11. Required final report

When done (or stopped), produce a single summary with:
1. **Auto-reply root cause** — exactly what query/decision-tree branch identified it.
2. **Changes made** — files touched, per task, with the commit hash for each.
3. **What is live now** — was `check-auto-reply` deployed? Did the end-to-end test in 3e pass? Paste the verifying query result.
4. **Frontend changes** — committed on `fix/auto-reply-and-backlog`, not yet live (await merge to `main`).
5. **Migrations written but not applied** — list them (proactive-outreach cron).
6. **Blocked / needs Michelle** — Stripe live test, key rotation, and the proactive-outreach billing/consent question.
7. **Anything that hit a stop condition** — what and why.

Do not `git push` to `main` and do not merge. Leave the branch for Michelle to review.
