# Creator Onboarding Fix Brief
**Generated:** 1 Jun 2026 by Cowork audit  
**For:** Claude Code — implement all fixes platform-wide (no creator-specific hacks)

---

## Context
Full A-Z creator signup audit revealed these issues. Every fix must work for ANY creator on the platform, not just Michelle or Carmen.

---

## P0 — PLATFORM BREAKING (AI will never work for new creators)

### Fix 1: Auto-create `ai_personas` row on admin approval

**Problem:** The `admin_approve_creator_application()` RPC approves a creator but never creates a row in `creator_ai_personas`. Auto-reply calls `.maybeSingle()` on that table and gets `null`, causing the AI reply function to skip. Every new creator will have broken AI out of the box.

**File to edit:** `supabase/migrations/` — create a new migration, or edit the existing `admin_approve_creator_application` RPC definition (find it in the migrations folder).

**What to do:** Inside `admin_approve_creator_application`, after granting the creator role, add:

```sql
INSERT INTO creator_ai_personas (
  creator_id,
  is_enabled,
  mode,
  tone,
  auto_reply_delay_minutes,
  upsell_aggressiveness,
  created_at,
  updated_at
)
VALUES (
  v_creator_id,   -- the creator's user ID resolved inside the RPC
  false,          -- off by default; creator must turn on
  'auto',
  'friendly',
  2,
  'light',
  now(),
  now()
)
ON CONFLICT (creator_id) DO NOTHING;  -- safe to re-run
```

Also add a migration that backfills any existing approved creators who are missing a row:

```sql
INSERT INTO creator_ai_personas (creator_id, is_enabled, mode, tone, auto_reply_delay_minutes, upsell_aggressiveness, created_at, updated_at)
SELECT u.id, false, 'auto', 'friendly', 2, 'light', now(), now()
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN creator_ai_personas cap ON cap.creator_id = u.id
WHERE ur.role = 'creator'
  AND cap.creator_id IS NULL;
```

---

## P1 — ONBOARDING GAP (creator never learns about AI setup)

### Fix 2: Add AI persona step to creator onboarding

**Problem:** `CreatorOnboarding.tsx` has 4 steps (Profile, Pricing, Message Pack, Stripe Connect). After completing them, the creator has no idea about AI persona setup. There's no prompt, no link, nothing. AI will stay off forever unless they accidentally find `/settings/ai-persona`.

**File:** `src/pages/CreatorOnboarding.tsx`

**What to do:** Add Step 5 — "AI Assistant Setup" (optional, can skip). This step should:
- Show `is_enabled` toggle prominently ("Turn on AI auto-replies")
- Show `tone` dropdown (flirty / friendly / playful / warm / professional)
- Show `mode` dropdown (auto-send / draft for review)
- Show `auto_reply_delay_minutes` (0–60)
- Have a "Skip for now" button (goes to dashboard)
- On save: upsert into `creator_ai_personas` with `is_enabled = true` if they filled it in

The step label in the progress indicator should read: "AI Setup (optional)"

---

## P2 — UX BUGS

### Fix 3: "Get Started" on homepage should open Sign Up tab

**Problem:** `/` → "Get Started" button → `/auth` → lands on Sign In tab. Confusing for new users.

**File:** Check where `/auth` is navigated to from the homepage CTA. In `src/pages/Index.tsx` or wherever the "Get Started" button is, the link should be `/auth?tab=signup` or similar. Then in `src/pages/Auth.tsx`, read the `tab` query param and default the active tab to "Sign Up" when `tab=signup`.

---

### Fix 4: `/creator-auth` Apply tab should be the default for new visitors

**Problem:** `/creator-auth` defaults to "Sign In" tab. New creators who click "Are you a creator? Get paid →" are shown Sign In first — they have to click "Apply" manually.

**File:** `src/pages/CreatorAuth.tsx` (or equivalent)

**What to do:** Default `activeTab` state to `'apply'` instead of `'signin'`. Alternatively, add `?tab=apply` support and link to it from the homepage CTA. Existing creators bookmarking the URL will still see Sign In because they know to click that tab.

---

### Fix 5: "Back to Sign In" on application success screen routes incorrectly

**Problem:** After submitting an application, the success screen shows a "Back to Sign In" button that navigates back to Apply Step 1 instead of the Sign In tab.

**File:** Find the success/confirmation view in `CreatorAuth.tsx` or a `CreatorApplicationSubmitted` component.

**What to do:** The button's `onClick` should set `activeTab = 'signin'` AND reset the step back to 1 (or navigate to `/creator-auth` with `?tab=signin`). It should NOT leave the user on the Apply form with blank fields.

---

### Fix 6: Add "Resend confirmation email" on email-not-confirmed error

**Problem:** When a creator signs in before confirming email, they see "Sign in failed — Email not confirmed" with no way to resend.

**File:** `src/pages/CreatorAuth.tsx` sign-in error handler.

**What to do:** When the error message contains "email not confirmed" (case-insensitive), show an additional link/button: "Resend confirmation email". On click, call `supabase.auth.resend({ type: 'signup', email })`. Show a success toast "Confirmation email sent — check your inbox."

---

## P3 — MIGRATION VERIFICATION

### Fix 7: Verify `creator_verifications` columns are deployed

**Problem:** The code audit found a migration (`20260515000004_add_creator_verification_columns.sql`) that adds columns `instagram_handle`, `tiktok_handle`, `twitter_handle`, `follower_count`, `content_niche`, `about_yourself`, `admin_notes` to `creator_verifications`. If this migration was never applied (a previous migration had a syntax error that may have blocked it), creator applications cannot be stored.

**What to do:**
1. Run: `supabase db diff` or check Supabase Dashboard → Database → Tables → `creator_verifications` to confirm these columns exist.
2. If missing: `supabase db push` or apply the migration manually via the Supabase SQL editor.
3. Verify the `submit_creator_application` RPC inserts into all these columns correctly.

---

## Summary Table

| # | Priority | File(s) | What to fix |
|---|----------|---------|-------------|
| 1 | P0 🔴 | Supabase migration (new) | Auto-create `ai_personas` row on approval + backfill existing |
| 2 | P1 🟠 | `CreatorOnboarding.tsx` | Add Step 5: AI Assistant Setup |
| 3 | P2 🟡 | `Index.tsx` + `Auth.tsx` | "Get Started" → Sign Up tab |
| 4 | P2 🟡 | `CreatorAuth.tsx` | Default to Apply tab |
| 5 | P2 🟡 | `CreatorAuth.tsx` | Fix "Back to Sign In" routing |
| 6 | P2 🟡 | `CreatorAuth.tsx` | Resend confirmation email link |
| 7 | P3 🔵 | Supabase DB | Verify migration columns deployed |

---

## Testing after fixes

After Claude Code implements the above:

1. Sign up as a brand-new creator (use a real email you can confirm)
2. Confirm email
3. Log into admin dashboard, approve the application
4. Verify `creator_ai_personas` row was auto-created with correct defaults
5. Log in as the new creator — should land on onboarding
6. Complete all 5 onboarding steps including AI setup
7. Have a fan send a message
8. Confirm AI auto-reply fires within the delay window
9. Check creator dashboard shows the reply in earnings

---

*This brief was generated by Cowork (Claude Sonnet) after a full Chrome-driven audit of the live app plus static code analysis of the repo.*
