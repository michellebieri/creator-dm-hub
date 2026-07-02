# QA REPORT — dmme platform — ROUND 2 — 2026-05-15

**Tester:** Claude CoWork (human-behavior QA)
**Environment:** Production — https://creator-dm-hub.vercel.app — commit `c019037` (all migrations through `20260515000005` applied)
**Method:** Live browser testing of LB#1 admin-side UI, LB#2 email confirmation with a real Gmail inbox, and regression spot-checks of the fixes shipped this session.
**Source of truth:** PROJECT_STATE.md.
**Reference:** Round-1 report at `QA_REPORT_2026-05-15.md`.

---

## ⚠️ ACTION REQUIRED BEFORE NEXT QA / BEFORE LAUNCH

1. **Re-enable "Confirm email" in Supabase before launch** — currently OFF again (toggled off at end of this session because LB#2 below blocks the real flow). It MUST be on in production.
2. **Bump Supabase email send rate limit** — currently **2 emails/hour** (free-tier default visible in Auth → Rate Limits). Any real signup volume will hit this almost immediately.

---

## HEADLINE

**LB#1 admin-side fully verified** ✅ — Approve and Reject through the UI both work end-to-end, with creator-side routing landing correctly on `/dashboard` (approved) or staying signed out on `/creator-auth` (rejected). Combined with the round-1 creator-side verification, **LB#1 is now closed**.

**LB#2 is NOT closed** — and now we have evidence for *why*. Email delivery works, the verification mechanism works, but **Gmail's safelinks scanner pre-fetches the confirmation link and consumes the single-use token before the real user can click it**. By the time the user clicks, Supabase reports `otp_expired` and the frontend silently swallows the error fragment — the user sees a clean Sign In form with no indication that (a) anything went wrong, or (b) their account is, ironically, actually confirmed.

Round-1's audit-1, routing-1, and the LB#1 frontend rewrite are all verified working. The platform's core monetization engine was not retested (covered exhaustively round 1, no relevant code touched).

---

## LAUNCH BLOCKERS

### 🔴 LB#2 (UNCHANGED, now with smoking-gun evidence) — Email confirmation UX is broken for any inbox provider that pre-fetches links

**Summary:** Supabase's email confirmation endpoint (`/auth/v1/verify`) consumes its OTP token on the first GET. Gmail (and Outlook, corporate scanners, etc.) pre-fetches links in incoming mail to scan them. **The prefetcher consumes the token. The real user's click then sees `otp_expired`.** The frontend doesn't surface the error and has no "resend" path.

**Reproduction (today, this account):**
1. Sign up `michellebieriuae@gmail.com` via `/creator-auth` Apply form at 11:45 with email-confirm ON.
2. Email arrives in Gmail inbox from `Supabase Auth <noreply@mail.app.supabase.io>` ✓.
3. Click the **"Confirm your mail"** link.
4. Lands on `https://creator-dm-hub.vercel.app/creator-auth#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb=`
5. **Page renders a clean Sign In form with no error message anywhere.** User has no idea what happened.

**Evidence — Supabase Auth Logs** (URL: `…/logs/auth-logs`):
```
11:45:27   mail.send                                                ← email sent
11:45:28   /signup    | request completed                           ← account created
11:55:37   /verify    | request completed                           ← FIRST hit (succeeded)
11:55:37   Login                                                    ← session issued
11:55:39   /user      | request completed
11:55:42   /verify    | 403: Email link is invalid or has expired   ← second hit (token already consumed)
11:55:56   /verify    | 403: Email link is invalid or has expired   ← third hit
11:58:41   /verify    | 403: Email link is invalid or has expired   ← fourth hit (this was my manual click)
```

Four `/verify` hits within 3 minutes on a single-use token. The first hit at 11:55:37 wasn't a human — it was Gmail's scanner. The subsequent three (one ~5 sec later, one ~14 sec later, one ~3 min later) all returned 403 because the token was already burned.

**Evidence — Supabase Users panel** for `michellebieriuae@gmail.com`:
```
Confirmation sent at: 2026-05-16 07:45:27.464204+00
Confirmed at:         16 May 2026 11:55
Last signed in:       16 May 2026 11:55
```

The account *was* confirmed at 11:55 — matching the first prefetch hit timestamp. The Gmail scanner did the verification work and was even auto-issued a session that nobody can use.

**This is two distinct defects:**

#### Defect 1 — Single-use verification token + email-client prefetch = systemic broken-link UX
Every Gmail signup (and Outlook, and most corporate email gateways) hits this. The token is consumed by the scanner before the human ever clicks. Not a Supabase bug per se — it's the well-known limitation of OTP-style email confirmation. Supabase ships an alternative.

**Fix direction:** switch to Supabase's **PKCE / token-hash confirmation flow** (the verify endpoint can be called with `type=signup` + `token_hash` rather than a single-use OTP, and it can be made idempotent or PKCE-bound to the originating client). Reference: https://supabase.com/docs/guides/auth/server-side/email-based-auth-with-pkce-flow-for-ssr (and the corresponding SPA / client-side variant). Alternative: switch the entire onboarding to magic-link sign-in (different verification semantics, also less prefetch-vulnerable).

**Affected files:** Supabase Auth project config (URL Configuration → make sure redirect URLs include the new PKCE callback if used), `CreatorAuth.tsx` (the `emailRedirectTo` + the post-confirm flow), `Auth.tsx` (customer signup path). **Classification:** Backend Auth config + frontend. **Platform-wide.**

#### Defect 2 — Frontend silently swallows `#error=…` fragments on `/auth` and `/creator-auth`
After clicking a stale/expired confirmation link, the user lands on `/creator-auth#error_code=otp_expired&…` and sees a **clean Sign In form with zero feedback**. No banner. No toast. No "Resend confirmation" CTA. They will try their password, get "Invalid login credentials" (Supabase's deliberate enumeration-resistant generic error), and assume signup failed entirely.

**Fix direction:** parse `location.hash` for `error`/`error_code`/`error_description` on `/auth` and `/creator-auth` mount; if `otp_expired` or `access_denied`, render: *"Your confirmation link has already been used or expired. If you signed up recently, your account may already be confirmed — try signing in below. Otherwise click here to resend the confirmation email."* with a resend-email RPC bound to the displayed email.

**Affected files:** `src/pages/CreatorAuth.tsx`, `src/pages/Auth.tsx`. **Classification:** Frontend. **Platform-wide.** This bug is independent of Defect 1 — even with PKCE fixed, real users could still land on these pages with expired/used links from old emails and deserve a helpful error.

---

## PHASE A — LB#1 admin-side verification — ALL PASS ✅

| Step | Result | Evidence |
|---|---|---|
| Admin (Michelle) signs in, opens `/admin` → Applications tab | ✅ | 2 pending applications visible; admin KPIs (Platform earnings $58.75, Gross volume $234.99, Users/Creators 13/4, Revenue by source bars, Top earning creators) all render |
| Find specific PROJECT_STATE-referenced app `qap778857163` | ⚠️ Not present | Searched, returns All(0)/Creators(0). PROJECT_STATE reference appears stale — Claude Code ran the pipeline multiple times; only the newer `qap853701259/853892412/854348664` series remain. Not a regression — the test premise had aged. |
| Approve a fresh pending application (`qap854348664`) | ✅ | Toast: *"Approved — QA Pipeline 1778854348664 is now live."* Status badge Pending → **Approved** (green). Applications counter 2 → 1. Creators counter 4 → 5. Approve/Reject buttons disappeared from the approved row. RPC `admin_approve_creator_application` fired correctly + atomically updated `user_roles`, `profiles.role`, `creator_verifications.status` |
| Reject another pending application (`qap853892412`) with required reason | ✅ | Required-reason modal opened; entered a placeholder reason; toast: *"Rejected — Applicant has been notified."* Status badge → **Rejected** (red). RPC `admin_reject_creator_application` works |
| Sign in as approved creator → must land on `/dashboard` (NOT `/creator-application-pending`) | ✅ | Credentials `qa-pipe-creator-1778854348664@inboxbear.com / QaTest!1778854348664` → toast *"Welcome back! You've signed in as a creator"* → URL `/dashboard` → Creator dashboard renders with profile link `https://creator-dm-hub.vercel.app/qap854348664`, creator bottom nav (Revenue / Messages / + / Vault / More), subscription-tier nudge |
| `/creator-dashboard` reachable for the approved creator | ✅ | After ensuring no cross-tab Michelle session interference, profile link `qap854348664` rendered consistently; `localStorage` session matched the creator's UID `4d535d0c-2c09-467f-957a-79354fe9b2b4` |
| Sign in as rejected creator | ✅ | Credentials `qa-pipe-creator-1778853892412@inboxbear.com / QaTest!1778853892412` → URL stayed at `/creator-auth` → `localStorage.hasSession: false` → form fields cleared. This matches `CreatorAuth.tsx handleSignIn` lines 239-245 exactly: verification status `rejected` → `supabase.auth.signOut()` → user kicked back. (The toast expired off-screen before screenshot; session-cleared evidence is equivalent proof.) |

**Conclusion:** LB#1 admin-side is fully verified through the real UI. Combined with the creator-side `lb1_partial.mjs` 3/3 PASS, **LB#1 is closed**.

### Minor observation during Phase A
- **Cross-tab auth interference.** When I had Michelle signed in on the controlled browser and `localStorage` for the approved creator overwrote then got reverted, it turned out the user (the human operator) had Michelle in another tab in the same Chrome profile — shared `localStorage` syncs across tabs, so a token refresh in the other tab silently replaced the QA session. Not a platform bug, but worth knowing if you ever see "Michelle" appear where you expect a fresh test creator: check for other tabs.

---

## PHASE B — LB#2 email confirmation — FAILS (see Launch Blockers above)

Documented above as the headline finding. Summary:
- Toggle was confirmed OFF (last QA session) → toggled ON → fresh signup against real Gmail `michellebieriuae@gmail.com` → email delivered ✓ → link click returned `otp_expired` → Auth logs and Users panel prove Gmail's prefetcher consumed the token at 11:55:37, account *is* technically confirmed → frontend silently swallowed the error fragment.
- **Toggle has been flipped back OFF** so future QA signups aren't stranded. Must be ON for launch — but only after Defect 1 + Defect 2 are fixed.

---

## PHASE C — regression spot-checks — 5/5 PASS ✅

### C-1 — Fresh customer sees Subscribe button + tier-picker dialog on `/qac784621052`
- Signed in as `qa.customer.m515@inboxbear.com` (existing customer, never subscribed to qac784621052).
- Profile renders: "$5 / message" badge, Chat + Subscribe buttons (no "Subscribed" state).
- Clicked Subscribe → dialog "Subscribe to QA Fresh Creator 1778784621052" opened, **6 tiers listed** (4× Lifecycle $4.99/mo + VIP $9.99/mo + Test Tier 1778840975516 $9.99/mo), each with its own Subscribe button + close (×).
- Did not actually subscribe. **PASS.**

### C-2 — QA customer chat + unlock at `/messages?creator=4c6c34bb-…`
- Signed in as `qa-fresh-cust-1778784621052@inboxbear.com / QaTest!1778784621052`.
- Chat loaded; "Subscribed ✓" header (customer is already a subscriber); 3 prior outbound messages render; creator message "unlockable test 1778827667404" + an unlockable content card.
- **State limitation:** the unlockable in this thread was *already unlocked* by this customer in earlier testing — rendering as the yellow placeholder image. Could not exercise the locked-state premium-gradient + Unlock-button path on this customer because there's no remaining locked content here. The unlock flow itself was fully verified end-to-end in round 1 against a fresh creator+customer pair. The unlocked-state render here works correctly. **PASS** (no regression observed) with state caveat.

### C-3 — Admin KPIs on `/admin` for Michelle
Already exercised during Phase A:
- Platform earnings: **$58.75** (25% fees collected — labeled separately from gross)
- Gross volume: **$234.99**
- Active subscribers: 0
- Users/Creators: 13/5 (after the Phase-A approve)
- Revenue by source: Unlockable $154.99 (fee $38.75, 8 tx) + Message payments $80.00 (fee $20.00, 15 tx)
- Top earning creators: Michelle $176.24

All consistent with round-1 baseline + this round's transactions (no new spends). **PASS.**

### C-4 — AUDIT-1 fix verified (creator settings save persists with no `creator_settings` row)
Signed in as the freshly-approved creator (`qa-pipe-creator-1778854348664`), no `creator_settings` row yet (hadn't been through `CreatorOnboarding`).
- `/settings/messaging` loaded showing default $3 (component-level defaults — confirms row absence).
- Changed Pricing per message $3 → $7. Clicked Save Changes. Toast: *"Settings saved successfully."*
- Hard reload `/settings/messaging`. Field shows **$7** — value persisted.

Round-1 finding (AUDIT-1: HIGH severity, silent-save / false-success) is **fixed**. The `.update().eq()` → `.upsert(..., onConflict: 'user_id')` refactor in commit `80dec72` works as intended for the no-row case. **PASS.**

### C-5 — ROUTING-1 fix verified
Navigated to `https://creator-dm-hub.vercel.app/admin-dashboard` (the stale URL with a dash — round-1's routing bug).
- Rendered a clean **"Page not found"** page with body text "No creator with this handle, and no page at this URL." and a "Go home" button.
- No destructive toast. No auto-bounce. URL stayed on `/admin-dashboard` so the user can see what they typed. **PASS.**

---

## REGRESSIONS

None observed. Round-1 PASSES (wallet, paid messages, subscribe, unlock, fee split, etc.) were not exhaustively re-tested but no functional code in those paths changed this session.

---

## NEW / REOBSERVED ISSUES (beyond LB#2)

### 🟡 EMAIL-RATE-LIMIT (MEDIUM, pre-launch config)
**Supabase email send rate limit is 2/hour** — visible in Auth → Rate Limits. That's the free-tier default. Any real signup volume will exhaust this in minutes and silently fail to send confirmation emails (which will look like LB#2 even when LB#2 is fixed). Bump this before launch — either via custom SMTP (Resend/Postmark/SendGrid) on a paid Supabase plan, or upgrade the Supabase plan + bump the rate limit explicitly. Affected: Supabase project config. **Classification:** infra.

### 🟡 SIGNOUT-1 still present
Confirmed recurring: "Sign Out" in the top nav frequently needs **two clicks** to take effect on the homepage's creator-flavored variant. Reproduced again this round when switching from Michelle → creator → customer. Already logged round 1 (B6). **No change** — not blocking, but UX friction.

### 🟢 FIXES VERIFIED THIS ROUND
- **LB#1 admin-side approve/reject end-to-end** ✅
- **AUDIT-1 silent-save in settings pages** ✅
- **ROUTING-1 `/:id` catch-all** ✅
- **CreatorAuth false-reassurance** (Defect C from round 1) — implicitly verified via the rejected-creator path (no longer fakes "Application Under Review")

---

## RECOMMENDED PRIORITIES (ruthless order)

1. **LB#2 Defect 1 — switch to PKCE / token-hash email confirmation.** Until this lands, every Gmail signup is broken. This is the only hard launch blocker left.
2. **LB#2 Defect 2 — handle `#error=otp_expired` on `/auth` and `/creator-auth`** with a helpful message + Resend CTA. Independent of Defect 1; should ship together regardless.
3. **Bump email rate limit / configure custom SMTP** before any volume hits production. 2/hour will silently break onboarding the moment LB#2 is fixed.
4. **Re-run a clean LB#2 verification** once 1+2 are deployed: real Gmail signup → click confirmation link → land logged in → `Confirmed at` populated AND user sees no error.
5. **(Post-launch)** ONBOARDING-3, CHAT-UX-1, SIGNOUT-1, FORM-1, ONBOARDING-2 toast, A11Y-1, `.env` `pk_live_` mismatch, B12 onboarding polish, B13 logged-out nav (all from round 1).

---

## NOT COVERED THIS ROUND (intentional)

- Wallet deposit / first-3-free / paid message / subscribe / free-message enforcement / unlock / fee split — exhaustively covered in round 1, no relevant code touched.
- Subscription cancel + renewal cron — still not exercised; needs DB row backdate to simulate; recommend Claude Code runs it server-side.
- Insufficient-balance handling, bundle purchase, voice messages, mobile responsiveness, admin/creator UI separation with a clean admin-only account — same status as round 1.

---

## TEST ARTIFACTS

- **Approved creator** (Phase A): `qa-pipe-creator-1778854348664@inboxbear.com / QaTest!1778854348664` — UID `4d535d0c-2c09-467f-957a-79354fe9b2b4`, now a real Creator in the system.
- **Rejected creator** (Phase A): `qa-pipe-creator-1778853892412@inboxbear.com / QaTest!1778853892412` — `creator_verifications.status = 'rejected'` with the reason "QA round 2 — testing reject flow. (Pipeline E2E test account; safe to reject.)"
- **LB#2 test account** (Phase B): `michellebieriuae@gmail.com / QaRound2LB2!` (display name "QA Round 2 LB2 Test", UID `74ceccc5-955d-49f1-900a-a2a7854ce0ad`). Account *is* confirmed in the DB despite the broken UX. Safe to leave or delete.
- **Confirm-email toggle** in Supabase Auth is currently **OFF** — must be re-enabled before launch (after LB#2 fixes ship).
