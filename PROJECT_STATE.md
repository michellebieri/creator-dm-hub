# PROJECT STATE

Live handoff between **Claude Code** (engineer — source of truth for architecture, migrations, fixes, deployment) and **Claude CoWork** (human QA tester / operator). Updated after every major fix.

Last updated: 2026-05-15

---

## Current Production Status

- **Hosting:** Vercel auto-deploys on push to `origin/main`. Promote-on-push is enabled.
- **Latest production commit:** `560bb6f` (`fix(LB#1): GRANT SELECT/INSERT/UPDATE on creator_verifications`). All LB#1 migrations through `20260515000005` **applied 2026-05-15** and verified by end-to-end test ([.qa/lb1_partial.mjs](.qa/lb1_partial.mjs) 3/3 pass). LB#1 creator-side resolved; admin-side awaiting manual CoWork verification (admin login → /admin → Approve a real fresh application).
- **Frontend:** React 18 + TypeScript + Vite. Single bundle (~1.86 MB unminified; ~493 KB gzipped). Build clean, typecheck clean.
- **Backend:** Supabase (Postgres + RLS + Edge Functions + Storage + pg_cron + Realtime).
- **Payments:** Stripe Connect Express (creator payouts), Stripe Checkout (wallet deposits + bundles). Platform fee: **25%**.

### Latest migrations applied (production-verified)

| File | Applied | Notes |
|---|---|---|
| `20260513000005_fix_content_unlock.sql` | 2026-05-15 | Re-applied today after handoff doc was wrong about earlier application |
| `20260514100001_protect_profile_sensitive_columns.sql` | 2026-05-14 | REVOKE UPDATE on `profiles.wallet_balance`, `profiles.role` |
| `20260514100002_messages_creator_only_insert.sql` | 2026-05-14 | RLS + `send_first_three_free_message` RPC |
| `20260514100003_lock_wallet_transactions_insert.sql` | 2026-05-14 | H3 — only RPCs can insert wallet_transactions |
| `20260514100004_scheduled_cron_with_row_lock.sql` | 2026-05-14 | H2 — FOR UPDATE SKIP LOCKED on scheduled-message cron |
| `20260514120001_restore_table_grants.sql` | 2026-05-14 | Restored grants for conversations, user_roles, etc. — missed `subscription_tiers` |
| `20260514120002_subscription_creator_id_and_pricing_policy.sql` | 2026-05-14 | BUG A (`creator_subscriptions.creator_id`) + BUG B (`creator_settings` RLS) |
| `20260514130001_audit_cron_balance_after_and_message_type_cast.sql` | 2026-05-14 | balance_after + enum cast fixes in cron + RPCs |
| `20260515000001_fix_subscription_tiers_grants.sql` | 2026-05-15 | Restored INSERT/UPDATE/DELETE on `subscription_tiers` (was silently 403) |
| `20260515000002_fix_transaction_type_enum_values.sql` | 2026-05-15 | Added `subscription`, `deposit`, `refund` to enum (was missing — all 3 flows broken) |
| `20260515000003_fix_creator_admin_pipeline.sql` | 2026-05-15 | Admin RLS policies on creator_verifications + profiles + user_roles; admin_approve / admin_reject / submit_creator_application RPCs |
| `20260515000004_add_creator_verification_columns.sql` | 2026-05-15 | Added instagram_handle, tiktok_handle, twitter_handle, follower_count, content_niche, about_yourself, admin_notes (never landed in prod because original migration 20260512000006 aborted on bad CREATE POLICY syntax) |
| `20260515000005_creator_verifications_grants.sql` | 2026-05-15 | GRANT SELECT/INSERT/UPDATE on creator_verifications to authenticated (RLS-without-GRANT pattern again) |

### Critical launch blockers

1. **🟠 LB#2 — Email confirmation delivery unverified (pure CoWork task)**
   - Toggle is currently OFF in Supabase. Must verify real delivery + re-enable.
   - Not app-code; can't be verified from code without inbox access.
   - **Action for CoWork:** sign up one account with a real inbox (Gmail/iCloud), confirm the email arrives + the redirect link logs the user in, then re-enable "Confirm email" toggle in Supabase → Authentication → Sign In / Providers → Email.

2. **🟡 LB#1 admin-side manual verification needed (creator-side resolved + E2E-verified)**
   - **Creator-side fully resolved.** Fresh signup → application submission → DB row with status=pending → clean signin all working ([.qa/lb1_partial.mjs](.qa/lb1_partial.mjs) 3/3 pass against brand-new account today).
   - **Admin-side still needs manual confirmation** that Approve flips role correctly end-to-end. I can't sign in as admin from code (no password in chat).
   - **Action for CoWork:** sign in as admin → `/admin` → Applications tab → find a fresh QA account (most recent was username `qap778857163`, display name "QA Pipeline 1778857163...") → click Approve → confirm: (a) success toast, (b) row moves out of pending list, (c) sign out, sign in as that creator → land on `/dashboard` or `/creator-onboarding`, NOT `/creator-application-pending`. If the new account doesn't appear → it's a real regression; report it.

### Known temporary workarounds (must be removed)

_None._ The Michelle band-aid INSERT from earlier is now isolated to the QA test creator account (`4c6c34bb…`), not affecting any real user flow. Test tiers accumulated on that account are normal test data, not platform workarounds.

### Resolved issues (this session 2026-05-15)

- **LB#1 — Creator approval pipeline fully resolved (creator-side, verified by E2E).** Four compounding bugs found and fixed:
  - **Defect B (SQL syntax)**: `CREATE POLICY IF NOT EXISTS` in `20260512000006` invalid → entire transaction aborted → admin policy + 7 columns never landed. Fix split into three migrations: `20260515000003` (admin policies + admin RPCs), `20260515000004` (missing columns), `20260515000005` (`GRANT SELECT/INSERT/UPDATE` on creator_verifications).
  - **Defect A (frontend swallowed errors)**: `submitApplication` now calls `submit_creator_application` SECURITY DEFINER RPC and throws on any error.
  - **Defect C (false reassurance)**: `handleSignIn` no-verification-row branch now switches the controlled Tabs to the Apply form with a clear toast instead of faking "Application Under Review".
  - **Defect D (RLS-without-GRANT)**: `creator_verifications` was missing the underlying GRANT — read attempts returned 42501 even with the admin policy applied. Same pattern as the `subscription_tiers` bug.
  - Plus AdminDashboard `handleApprove` / `handleReject` rewritten to call SECURITY DEFINER RPCs that atomically update user_roles + profiles.role + creator_verifications (bypassing the C1 column-REVOKE that would have silently failed direct UPDATE).
  - End-to-end verified by [.qa/lb1_partial.mjs](.qa/lb1_partial.mjs) 3/3 PASS against a brand-new account: signup → submit application → row in DB with status=pending → sign back in cleanly.
- AUDIT-1 silent-save in MessagingSettings + SocialsSettings — `.update().eq()` replaced with `.upsert(... onConflict: 'user_id')` and real-error toast. (commit `80dec72`)
- ROUTING-1 `/:id` catch-all — non-username-shaped IDs now render a clean inline 404 instead of toast + auto-bounce. PROJECT_STATE.md corrected: admin route is `/admin`, not `/admin-dashboard`. (commit `80dec72`)
- AUDIT-1 silent-save in MessagingSettings + SocialsSettings — `.update().eq()` replaced with `.upsert(... onConflict: 'user_id')` and real-error toast. (commit `80dec72`)
- ROUTING-1 `/:id` catch-all — non-username-shaped IDs now render a clean inline 404 instead of toast + auto-bounce. PROJECT_STATE.md corrected: admin route is `/admin`, not `/admin-dashboard`. (commit `80dec72`)
- Voice + Stats buttons hidden from customer/fan UI (creator-only) — `1baa7a8`
- Locked content card redesigned with premium gradient + frosted blur — `1baa7a8`
- Subscribe button added to chat header (was only on profile page) — `1baa7a8`
- Paying followers / Spenders / Subscribers filters wired to real `transactions` + `creator_subscriptions` data — `1baa7a8`
- Admin panel rebuilt: platform earnings separated from gross volume; revenue-by-source; top-10 creators by net earnings — `eef37ac`
- Creator dashboard: empty-state nudge for zero tiers + Quick Actions row — `eef37ac`
- Generic "Failed to process payment" toast now surfaces the real RPC error — `06b7b77`
- `@michelle` example placeholder in `Conversations.tsx` replaced with generic copy
- `unlock_content` RPC re-applied to production (was claimed-applied but actually wasn't)

### Resolved issues (previous session 2026-05-14)

- C1: profile sensitive columns protected (REVOKE on wallet_balance, role)
- C2: messages_creator_only_insert + `send_first_three_free_message` RPC
- H1/H2/H3: scheduled cron locking, wallet_transactions insert lock, audit
- Bug A: `creator_subscriptions.creator_id` column add + backfill
- Bug B: `creator_settings` RLS so customers can see pricing
- Bulk GRANTs restored on conversations, user_roles, and many other tables
- First-send race fix (`convOverride` parameter in `sendMessage`)
- Conversations upsert → SELECT-then-INSERT (avoids RLS denial on UPDATE)
- PostgREST embed normalization (unlockables 1-to-1 returned as object, code expected array)
- Realtime unlockable refetch (INSERT payload missing embedded relation)
- Dynamic avatar letter (was hardcoded `Y`)
- Wallet UI live update via `wallet-balance-update` CustomEvent
- Stripe webhook idempotency: processed_webhook_events insert moved to after success
- `list-payment-methods` edge function auth-header forwarding
- Export button removed from chat header (privacy)
- Bulk Upload button removed from creator chat UI

---

## Platform Rules

1. **All fixes must be platform-wide.** No Michelle-only fixes, no hardcoded UUIDs in product code or migrations.
2. **No data-level band-aids.** If a flow can't run via UI for a fresh user, fix the system (grant/policy/RPC/code) — don't INSERT rows by hand.
3. **Every flow must work for fresh users** — creators, customers, conversations, subscriptions, wallets, purchases, unlockables, onboarding — without manual DB intervention.
4. **Admin panel is the only place exempt** from "platform-wide" — admin features may stay Michelle-only (or admin-role-only) by design.
5. **SQL writes need approval.** Read-only investigation and inspection are free; INSERT/UPDATE/DELETE/CREATE require explicit user OK.
6. **Every manually-applied SQL must have a matching tracking migration** in `supabase/migrations/` so a fresh deploy reproduces it.
7. **Surface real errors.** No generic "Failed to process payment" — show the underlying RPC error so future regressions self-report.

---

## Architecture Notes

### Wallet flow
- Balance lives in `profiles.wallet_balance` (NOT a separate `wallets` table — this is a footgun, see #known-bugs).
- Balance reads from `useWallet` hook.
- **All wallet writes go through SECURITY DEFINER RPCs**, never direct UPDATE: `send_paid_message`, `purchase_subscription`, `unlock_content`, `use_subscription_message`, `send_bundle_message`, `process_all_subscription_renewals`.
- Deposits funded by Stripe Checkout → `stripe-webhook` adds to balance.
- Live UI updates use `window.dispatchEvent(new CustomEvent('wallet-balance-update', { detail: { balance } }))`.

### Subscription flow
- Tiers in `subscription_tiers` (creator_id, name, price, billing_interval, free_messages_per_month, unlimited_messages, is_active).
- Customer subscribes: `purchase_subscription(p_tier_id, p_creator_id)` RPC → wallet debit + insert into `creator_subscriptions` + `subscription_message_usage` row (if free messages) + `transactions` row (status=completed). All atomic.
- Renewal: pg_cron job `renew-wallet-subscriptions` runs daily at 02:00 UTC, calls `process_all_subscription_renewals()`. Uses `FOR UPDATE SKIP LOCKED`. Insufficient funds → status `past_due` + notification.
- Cancel: `creator_subscriptions.status` set to `canceling` — keeps access until `current_period_end`, no further charges.
- Customer subscribed-state hook: `useSubscription(userId, creatorId)`.
- Creator's subscribers: `/subscribers` page (`SubscribersList.tsx`).
- Customer's own subs: `/subscriptions` page (`Subscriptions.tsx`).
- **Free-message enforcement:** `useMessages.sendMessage` checks active subscription; if `unlimited_messages` or `messages_used < messages_allowed`, calls `use_subscription_message` RPC (atomic increment + insert).

### Unlockables flow
- Storage bucket `unlockables` is **public** (set in `20260513000005`). Media URLs stored in DB, only revealed in the UI after unlock.
- Unlock atomic RPC: `unlock_content(p_unlockable_id, p_creator_id, p_price)` — locks row, checks already-unlocked (idempotent), checks balance, deducts wallet, appends user_id to `unlockables.unlocked_by`, records `wallet_transactions` + `transactions` + `platform_fees`. Any failure rolls everything back.
- Customer-side display: `UnlockableContent.tsx` — locked card shows premium gradient + blur; after unlock, shows media.

### Onboarding flow
- Signup at `/auth` → email confirmation required (Supabase Auth) → user lands logged out, must click email link.
- Confirmed user lands on customer dashboard by default.
- To become creator: applies via `/creator-application` → row in `creator_verifications` (status=pending) → admin reviews in `/admin-dashboard` → on approve, admin sets `user_roles.role='creator'` + `profiles.role='creator'` (legacy) and creates notification.
- Approved creator runs through `CreatorOnboarding.tsx` to set pricing, profile, etc. `creator_settings` row created here (NOT during signup).
- **Profile sensitive columns are REVOKED at the column level** — clients cannot UPDATE `profiles.wallet_balance` or `profiles.role` even with `auth.uid()` matching the row. Use RPCs.

### Messaging flow
- `messages` table: RLS allows SELECT for participants. INSERT only via SECURITY DEFINER RPCs (after `20260514100002`): `send_paid_message`, `send_bundle_message`, `use_subscription_message`, `send_first_three_free_message`, plus creators inserting their own outbound messages.
- Realtime via Supabase `postgres_changes` on `messages`. Unlockable INSERTs trigger refetch (embedded relation missing in realtime payload).
- Conversations created with SELECT-then-INSERT pattern (RLS-safe; UPSERT requires UPDATE policy customer doesn't have).
- First-send race fixed by passing `convOverride` to `sendMessage` (state setter is async; closure captures stale `null` conversationId).

### Upload / media flow
- Three storage buckets: `avatars` (public), `unlockables` (public), `voice-messages` (public).
- File size limits configurable per bucket (default 50 MB; bumped to 500 MB for video unlockables — set in dashboard, not in migration).
- Voice messages: `VoiceRecorder` component, uploads to `voice-messages` bucket, passes public URL into `messages.voice_url` via `send_paid_message`.

### pg_cron jobs

| Job | Schedule | Function | Purpose |
|---|---|---|---|
| `renew-wallet-subscriptions` | `0 2 * * *` (daily 02:00 UTC) | `process_all_subscription_renewals()` | Auto-renew expired wallet subscriptions, charge wallet, extend period, refresh `subscription_message_usage` |
| `process-scheduled-messages` | `* * * * *` (every minute) | `process_pending_scheduled_messages()` | Send messages scheduled by creators |

### Edge functions

| Function | Purpose | Notes |
|---|---|---|
| `stripe-webhook` | Process Stripe events (payment_intent.succeeded, invoice.paid, subscription.created, etc.) | Idempotency via `processed_webhook_events`; insert is AFTER success |
| `create-payment` | Create Stripe Checkout session for wallet top-up or bundle | |
| `verify-payment` | Verify a completed Stripe Checkout (fallback if webhook delayed) | |
| `verify-bundle-payment` | Verify bundle purchase | |
| `list-payment-methods` | List user's saved Stripe payment methods | Auth-header forwarding (fixed yesterday) |
| `create-notification` | Insert into `notifications` table | **Returns 403 currently — cosmetic, not blocking** |

### RLS assumptions
- All tables have RLS enabled.
- Standard pattern: SELECT for participants (auth.uid() = creator_id OR customer_id), INSERT for creator-only or auth.uid() match, UPDATE/DELETE for owner.
- **RLS policies do NOT replace GRANTs.** A policy can allow an action that's still 403 if the underlying GRANT isn't present. See "Critical launch blockers" — this is exactly the `subscription_tiers` bug.
- `creator_settings`: customers can SELECT pricing for any creator (`user_roles.role = 'creator'`).
- `profiles.wallet_balance` + `profiles.role`: column-level REVOKE; only SECURITY DEFINER RPCs can write.

---

## Known Bugs

### 🟠 High priority (not launch-blocking but should fix soon)

**B4. ONBOARDING-3 — no automatic routing to CreatorOnboarding after a creator is approved**
- Severity: high (UX confusion, triggers AUDIT-1 hazards)
- Per CoWork QA report. A newly-approved creator lands on `/dashboard`, not `/creator-onboarding`, so they may never create `creator_settings` / `message_packs` → `price_per_message` stays at $5 default, settings pages have nothing to upsert against.
- **Fix direction:** route creators to `/creator-onboarding` until `creator_settings` row exists, OR have `admin_approve_creator_application` insert a default `creator_settings` row.
- Files: `src/App.tsx`, `src/contexts/AuthContext.tsx`, or in the approve RPC.

**B5. CHAT-UX-1 — payment-option card never collapses in active conversation for non-subscribed customers**
- Severity: medium UX (blocks chat view with always-pinned payment block)
- Per CoWork QA report. Subscribed customers see it collapse correctly; non-subscribed wallet customers don't.
- Files: `src/pages/MessagingInterface.tsx`.
- Fix direction: collapse the card once a conversation has messages and the customer has balance.

### 🟡 Cosmetic / post-launch

**B2. `create-notification` edge function returns 403**
- Severity: cosmetic — notifications fail silently, no UX impact on core flows
- Reproduction: any RPC that triggers `supabase.functions.invoke('create-notification', ...)` (admin approve, unlock, subscribe, etc.) — fetch returns 403
- Root cause: unknown, likely auth/headers config
- Current status: deferred (logged but not blocking launch)
- Files: `supabase/functions/create-notification/index.ts`

**B6. SIGNOUT-1** — Sign Out in top nav frequently needs two clicks. Homepage re-renders mid-click. Per CoWork report.

**B7. FORM-1** — Auth form fields lose typed input if filled immediately after navigation; second fill works.

**B8. ONBOARDING-2** — signup success toast says "Check your email to confirm your account" even when email confirmation is OFF and user is already logged in.

**B9. SUBSCRIBE-minor** — clicking a tier's Subscribe charges immediately with no confirmation step. Chat-header balance doesn't refresh after subscribing.

**B10. A11Y-1** — recurring console warning "Missing `Description` or `aria-describedby` for {DialogContent}" on multiple dialogs.

**B11. `.env` mismatch** — committed `.env` ships `VITE_STRIPE_PUBLISHABLE_KEY="pk_live_…"` while deployed app runs Stripe test mode. Confirm key mode deliberately at launch.

**B12. CreatorOnboarding polish** — Step 1 "Display Name" doesn't pre-fill from profile; Step 3 pack price doesn't auto-fill Suggested; allows pack priced above regular.

**B13. Logged-out landing page** renders authenticated bottom nav (Home/Messages/Vault/More) that just bounces to `/auth`.

### 🟢 Resolved (kept for reference)

- ~~LB#1 creator approval pipeline~~ (4 defects: invalid SQL, swallowed errors, false reassurance, missing GRANT) → migrations `20260515000003-5` applied + frontend rewritten in commit `80dec72`. Verified by [.qa/lb1_partial.mjs](.qa/lb1_partial.mjs) 3/3 pass; subscription lifecycle regression `subs_lifecycle.mjs` 9/9 pass.
- ~~ROUTING-1 `/:id` catch-all noisy 404~~ → clean inline 404 + early reject of non-username IDs.
- ~~AUDIT-1 silent-save in settings pages~~ → `.upsert(... onConflict: 'user_id')` + real-error toast.
- ~~`transaction_type` enum missing `subscription`, `deposit`, `refund`~~ → migration `20260515000002` applied 2026-05-15. Verified by lifecycle E2E (9/9 pass: wallet debited exactly, `creator_subscriptions` row created, visible in `/subscribers` + `/subscriptions`).
- ~~`subscription_tiers` missing INSERT/UPDATE/DELETE grant~~ → migration `20260515000001` applied 2026-05-15. Verified by fresh-user E2E.
- ~~`unlock_content` RPC missing in prod~~ → applied 2026-05-15
- ~~First-send silent fail~~ → `convOverride` fix in `useMessages.tsx`
- ~~Locked content "fat white block"~~ → premium gradient in `UnlockableContent.tsx`
- ~~Voice + Stats visible to customers~~ → `isCreator &&` wrapped
- ~~Paying followers (0) always~~ → wired to `transactions` query in `Lists.tsx`
- ~~Admin panel mixed creator earnings with platform fees~~ → rebuilt in `AdminDashboard.tsx`

---

## Regression Checklist

Run after every fix that touches the relevant area.

### Creator onboarding
- [ ] Signup with new email → confirmation email received → click confirms account
- [ ] First login lands on customer dashboard
- [ ] Apply at `/creator-application` → row in `creator_verifications` with status=pending
- [ ] Admin sees application in `/admin-dashboard` Applications tab → approve
- [ ] Approved creator can complete `CreatorOnboarding` → `creator_settings` row created
- [ ] Creator's profile (`/:username`) shows price-per-message badge + Chat button
- [ ] Creator dashboard shows nudge "Set up subscription tiers" when zero tiers

### Customer onboarding
- [ ] Signup as customer → email confirm → login
- [ ] Visit a creator's profile → can click Chat → conversation row created via SELECT-then-INSERT (no 23505 race)
- [ ] First 3 free messages send without wallet deduction
- [ ] Wallet top-up flow (Stripe Checkout) credits balance via `stripe-webhook`

### Paid messages
- [ ] After 3 free, send a paid message → `send_paid_message` RPC → wallet drops by exact `price_per_message` → `transactions` row created with status=completed, platform_fee=25%
- [ ] Wallet UI updates instantly (CustomEvent dispatched)
- [ ] On refresh: balance still correct, message still in conversation
- [ ] Insufficient balance: clear toast, message NOT inserted (RPC rolls back)

### Unlockables
- [ ] Creator uploads unlockable in chat → row in `unlockables` + storage object in `unlockables` bucket
- [ ] Customer sees locked card with premium gradient
- [ ] Click Unlock → `unlock_content` RPC → wallet deducts → `unlocked_by` array contains user → image renders
- [ ] Already-unlocked: clicking returns success without double-charging
- [ ] Insufficient balance: error surfaces real reason, no wallet change

### Subscriptions
- [x] Creator creates tier at `/settings/subscription` via UI (verified 2026-05-15)
- [x] Tier appears in creator's tier list and on customer's view of `/creator/:username` (Subscribe button visible)
- [x] Customer clicks Subscribe → tier-picker dialog → confirm → `purchase_subscription` RPC → wallet debits exactly tier price → `creator_subscriptions` row created (status=active)
- [x] Subscription appears in creator's `/subscribers` list
- [x] Subscription appears in customer's `/subscriptions` list
- [x] Customer can send free messages (verified by CoWork: usage 5→4, zero wallet charge, `use_subscription_message` used not `send_paid_message`)
- [ ] Cancel → status=`canceling` → access kept until `current_period_end`
- [ ] Renewal cron simulation: backdate `current_period_end` → wait for cron OR call `process_all_subscription_renewals()` directly → row renewed, wallet debited, usage refreshed

### Creator onboarding
- [x] Brand-new creator signs up + submits application via `/creator-auth` Apply form (verified 2026-05-15 via lb1_partial.mjs — fresh account `qap778857163`)
- [x] `creator_verifications` row written with status=pending, all fields persisted
- [x] Signed-in creator with pending application routes correctly (NOT fake "Application Under Review")
- [ ] **(manual CoWork)** Admin sees fresh application in `/admin` Applications tab
- [ ] **(manual CoWork)** Admin clicks Approve → role assigned in `user_roles` + `profiles.role='creator'`
- [ ] **(manual CoWork)** Approved creator can reach `/creator-onboarding` and complete profile setup

### Uploads
- [ ] Image (PNG/JPG) under 50 MB uploads to unlockables bucket
- [ ] Video upload under 500 MB succeeds (bucket file_size_limit set in dashboard)
- [ ] Voice message records + uploads to `voice-messages` bucket + plays back

### Admin panel
- [ ] Platform earnings KPI = SUM(`transactions.platform_fee`) — NOT mixed with creator revenue
- [ ] Gross volume KPI = SUM(`transactions.amount`)
- [ ] Active subscribers count matches `creator_subscriptions` where status in ('active', 'canceling')
- [ ] Revenue-by-source bars proportional and labeled (Subscriptions, Message payments, Unlocks, Tips, Bundles, Deposits)
- [ ] Top creators ranked by `SUM(net_amount)` per `creator_id`
- [ ] Pending applications tab shows new creator-verifications

### Wallet deductions
- [ ] No flow updates `profiles.wallet_balance` directly via REST (must go through RPC)
- [ ] All deductions create a corresponding `wallet_transactions` row with `balance_after` populated
- [ ] No `wallets` table referenced anywhere — schema uses `profiles.wallet_balance`

### Relogin / refresh persistence
- [ ] Send a paid message → log out → log back in → message still in conversation, balance still correct
- [ ] Hard refresh (Cmd+Shift+R) — wallet balance, conversation list, message contents, subscription state all rehydrate
- [ ] Unlock content → hard refresh → image still unlocked, balance still deducted

---

## Latest CoWork QA Findings

### 2026-05-15 — Full fresh-user QA sweep (see `QA_REPORT_2026-05-15.md` for the complete report + engineer handoffs)

**⚠️ Email confirmation is currently toggled OFF in Supabase (done for this QA session) — MUST be re-enabled before launch.**

**🔴 LAUNCH BLOCKER #1 — creator approval pipeline is broken end-to-end.** No new creator can be onboarded. Application never reaches `/admin` ("No applications yet"). Root cause: `20260512000006_creator_application_fields.sql` uses invalid `CREATE POLICY IF NOT EXISTS` (not valid Postgres) → admin RLS policy never created; plus `CreatorAuth.tsx` swallows the `creator_verifications` upsert error and its sign-in `else` branch shows a false "Application Under Review". Every existing creator only has the role via direct DB grants — the approval flow has never worked.

**🔴 LAUNCH BLOCKER #2 — email-confirmation delivery is unverified.** Prior QA bypassed it with `UPDATE auth.users` (`.qa/regression.mjs`) and the dead `inboxbear.com`. Whether a real confirmation email delivers / the redirect works has never been tested. Verify before launch.

**🟠 AUDIT-1 (HIGH, confirmed)** — `MessagingSettings.tsx` / `SocialsSettings.tsx` use `.update()` not `.upsert()`; for a creator with no `creator_settings` row, Save shows "saved successfully" but persists nothing (silent data loss).

**Correction:** the previously-recorded "fresh-user E2E 9/9 pass" is invalid — it ran on accounts that bypassed both onboarding gates via manual DB writes. A true fresh-user E2E through the UI has now been done and is recorded in the QA report.

**What DID pass for a brand-new creator + customer:** CreatorOnboarding, tier creation, unlockable upload, wallet deposit (Stripe), first-3-free, paid message, subscribe, free-message enforcement, unlock, 25/75 fee split, creator-side subscriber/earnings reflection, wallet ledger exact to the cent. The monetization engine is sound — only the approval gate that *grants* the creator role is broken.

Other findings (ROUTING-1, CHAT-UX-1, ONBOARDING-2/3, SIGNOUT-1, FORM-1, A11Y-1, `.env` pk_live mismatch): see `QA_REPORT_2026-05-15.md`. Note: documented admin route `/admin-dashboard` is wrong — it is `/admin`.

---

## Latest Claude Code Changes

### 2026-05-15 (this session)
- `560bb6f` — fix(LB#1): GRANT SELECT/INSERT/UPDATE on creator_verifications
- `1102faf` — fix(LB#1): add creator_verifications columns that never landed in prod
- `df40e5e` — docs: PROJECT_STATE.md — LB#1 frontend landed, DB pending
- `80dec72` — fix(LB#1): creator approval pipeline + AUDIT-1 silent save + ROUTING-1
- `a40b14d` — fix: add missing `transaction_type` enum values (`subscription`, `deposit`, `refund`)
- `2e726bf` — docs+fix: add PROJECT_STATE.md + GRANT migration + remove `@michelle` placeholder
- `06b7b77` — fix: surface real RPC error in unlock toasts instead of generic 'Failed to process payment'
- `eef37ac` — feat: admin panel rebuild + creator dashboard subscription nudges
- `1baa7a8` — fix: 4 customer-side UX bugs (subscribe button, locked content, lists, hide creator-only tools)

### 2026-05-14
- `ba8df07` — fix: render unlockables in customer chat (PostgREST object→array bug)
- `a811fbb` — chore: remove Bulk Upload button from creator chat UI
- `2c23d10` — chore: remove Export button from chat header (privacy)
- `251553d` — fix: wallet UI updates instantly after send; correct sender avatar letter
- `0ed151b` — fix: replace conversations upsert with SELECT-then-INSERT (RLS-safe)
- `37954ba` — fix: pass explicit convId on first message — closes silent first-send bug
- `60390c7` — fix: cron functions — restore balance_after + cast message_type enum
- `8e88a2c` — fix: restore missing table GRANTs + edge fn auth, track applied migrations
- `4292443` — fix: surface real error in pack-purchase failure toast

---

## Next Priorities

1. **CoWork: LB#2 email-confirm verification** — send signup with real inbox, confirm link works, re-enable Supabase Confirm-email toggle. Only critical launch blocker remaining.
2. **CoWork: LB#1 admin-side manual confirmation** — sign in as admin → `/admin` → see fresh QA application (most recent: `qap778857163`, "QA Pipeline 1778857163...") → click Approve → confirm role flips end-to-end.
3. **CoWork: create one real tier on `@Michellebieri` via UI** at [/settings/subscription](https://creator-dm-hub.vercel.app/settings/subscription) (UUID `e394bb4b-3d73-4c7a-96ff-9ff802e0f5d0`).
4. **Code: B4 ONBOARDING-3** — route approved creators through `/creator-onboarding` until `creator_settings` exists (closes AUDIT-1 hazard at the source).
5. **Code: B5 CHAT-UX-1** — collapse payment-option card in active conversations for non-subscribed customers.
6. **Code: cancel + renewal cron simulation** — verify `canceling` status keeps access until period_end; backdate + invoke `process_all_subscription_renewals()` to validate cron logic.
7. **Code: B2 `create-notification` 403** — diagnose + fix (cosmetic, post-launch).
8. **Cosmetics batch:** B6 (SIGNOUT-1), B7 (FORM-1), B8 (ONBOARDING-2 toast), B9 (subscribe-confirm + header balance), B10 (A11Y), B11 (.env), B12 (onboarding polish), B13 (logged-out nav).
2. **Code: free-message enforcement E2E** — subscribed customer with `unlimited_messages=true` sends a message, verify `use_subscription_message` RPC fires (not `send_paid_message`) and wallet is NOT debited.
3. **Code: cancel + renewal simulation** — verify `canceling` status keeps access until period_end; backdate a sub's period_end + manually invoke `process_all_subscription_renewals()` to validate cron logic.
4. **Code: fix `create-notification` 403** (B2) — defer or address.
5. **CoWork: full regression sweep** using the [Regression Checklist](#regression-checklist) on a brand-new creator + brand-new customer pair signed up today. Log findings under "Latest CoWork QA Findings" below.
6. **Code: stripe-webhook live test** — confirm `transaction_type='deposit'` now works end-to-end (a wallet top-up through real Stripe Checkout creates the transactions row without crashing the webhook).
