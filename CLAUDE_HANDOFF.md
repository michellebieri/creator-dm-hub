# Claude Code Handoff — dmme Project

## Project Overview

**Stack:** React 18 + TypeScript + Vite → Vercel (auto-deploy on push to `main`)  
**Backend:** Supabase (PostgreSQL + RLS + Edge Functions + pg_cron)  
**Payments:** Stripe Connect Express (creator payouts) + Stripe Checkout (wallet deposits, bundle/pack purchases)  
**Repo:** `~/Desktop/Coding/dmme`

---

## Critical Architecture Rules

### Role System
- `user_roles` table is the **authoritative source** for roles — never trust `profiles.role`
- `has_role(_user_id, _role)` RPC is used for role checks in edge functions

### Message Payment Tiers (in order)
1. **Subscription free messages** — `use_subscription_message` RPC (atomic)
2. **Bundle credits** — `send_bundle_message` RPC (atomic)
3. **Wallet pay-per-message** — `send_paid_message` RPC (atomic)
4. If none available → error toast

### Fee Split
- **25% platform fee / 75% creator net** — applies everywhere (messages, bundles, subscriptions)

### Subscription Status
- `canceling` is a **custom internal status** — Stripe keeps `active` but sets `cancel_at_period_end=true`
- Webhook handler converts this: `dbStatus = subscription.cancel_at_period_end ? "canceling" : subscription.status`

### Idempotency
- Stripe webhooks: `processed_webhook_events` table prevents double-processing
- Wallet deposits: unique index on `wallet_transactions(user_id, stripe_payment_intent_id)` — insert first, then update balance
- Bundle purchases: idempotency check via `stripe_payment_id` in `transactions` table

### Migration Workflow
- Supabase CLI `db push` stops at Dec 2025 migrations (timestamp collision in `schema_migrations`)
- **All migrations dated 2026xxxx must be applied manually** in Supabase Dashboard → SQL Editor

---

## All Bugs Fixed in This Session

### Batch 1 — Core payment & webhook bugs
| File | Bug | Fix |
|------|-----|-----|
| `supabase/functions/stripe-webhook/index.ts` | `customer.subscription.updated` overwrote `canceling` status with `active` | Check `cancel_at_period_end` flag before writing status |
| `supabase/functions/request-payout/index.ts` | Payout record inserted as `completed` before Stripe transfer — silent loss if Stripe fails | Insert as `pending` first, create transfer in try/catch (delete on failure), then update to `completed` |
| `supabase/functions/verify-wallet-payment/index.ts` | Race condition — two simultaneous calls could both pass idempotency check and double-credit wallet | Insert `wallet_transactions` row FIRST (unique constraint on `stripe_payment_intent_id`), then update balance. Code `23505` = already processed |
| `supabase/functions/process-refund/index.ts` | Refund approval always called Stripe even for wallet-based payments (no `stripe_payment_id`) | Check `stripe_payment_id`: if present → Stripe refund; if null → credit wallet directly |
| `supabase/functions/process-subscription-renewals/index.ts` | No authentication — anyone could trigger renewals | Added admin role check + service key check for pg_cron internal calls |
| `src/pages/EarningsDashboard.tsx` | Stats calculated from `.limit(20)` query — wrong for creators with >20 transactions | Added separate unlimited queries for stats, kept limited query only for display list |

### Batch 2 — Content & messaging bugs
| File | Bug | Fix |
|------|-----|-----|
| `src/pages/CreatorProfile.tsx` | 6× debug `console.log` exposing user IDs in production | Removed all debug logs |
| `src/pages/CreatorProfile.tsx` | Bundle content items (price=0) appeared in profile grid, free-unlockable | Collect all bundled unlockable IDs into a Set, filter content array to exclude them |
| `src/pages/MessagingInterface.tsx` | `handleSendVoice` used `.insert()` for conversation creation; could fail with unique constraint on double-tap | Changed to `.upsert()` with `onConflict: 'creator_id,customer_id'` |
| `src/hooks/useMessages.tsx` | "First 3 messages free" toggle in MessagingSettings was never read by message-send logic | In Step 3, fetch `first_three_free` from `creator_settings`; if true and sent count < 3, insert message for free |

### Batch 3 — Auto-reply & UX bugs
| File | Bug | Fix |
|------|-----|-----|
| `supabase/functions/check-auto-reply/index.ts` | `trigger_condition = 'scheduled'` was dead code — no case handled it | Added `isWithinSchedule()` helper checking UTC time + day of week against `schedule_start`/`schedule_end`/`days_active` |
| `src/hooks/useMessages.tsx` | `check-auto-reply` only invoked in wallet pay path (Step 3) — subscription and bundle sends never triggered auto-reply | Added fire-and-forget invoke to ALL customer success paths (subscription, bundle, first-3-free, wallet) |
| `src/components/AutoReplyManager.tsx` | New auto-replies inserted without `is_active`, defaulted to `false` in DB — silently inactive | Set `is_active: true` on insert |
| `src/pages/MyLibrary.tsx` | "Total Spent" stat only summed individual unlocks — bundle-only buyers saw $0 | Added `purchasedBundles` sum to the total |

### Batch 4 — Scheduled messages & notifications
| File | Bug | Fix |
|------|-----|-----|
| `supabase/migrations/20260514000001_scheduled_messages_cron.sql` | No trigger for `process-scheduled-messages` — all scheduled messages sat in `pending` forever | New migration: `process_pending_scheduled_messages()` SQL function + `cron.schedule('* * * * *', ...)` runs every minute |
| `supabase/functions/process-scheduled-messages/index.ts` | Called `send-notification` (doesn't exist) with wrong payload | Fixed to `create-notification` with correct `userId`/`title`/`message` fields |
| `src/components/MessageScheduler.tsx` | Selecting today with a past time silently did nothing — no error shown | Added `toast.error('Scheduled time must be in the future')` |
| `src/components/ScheduledMessagesList.tsx` | Only showed `pending` messages — `failed` messages hidden, creators had no visibility | Now renders a red "Failed to Send" section with error message and dismiss button |
| `src/hooks/useNotifications.tsx` | `markAsRead` updated DB but not local state — badge lagged; `markAllAsRead` DID update local state — inconsistent | Added optimistic local state update to `markAsRead` to match `markAllAsRead` pattern |

---

## Pending Manual Steps

### SQL migrations to apply in Supabase Dashboard → SQL Editor

These migration files exist in the repo but must be applied manually (CLI stops at Dec 2025):

**Already applied (from previous sessions):**
- `20260512000002` — fix_unlockables_update_and_transactions
- `20260512000003` — bundle_ownership_and_messaging  
- `20260512000004` — subscription_renewal_cron
- `20260512000005` — fix_content_unlock
- `20260513000006` — atomic_message_rpcs (use_subscription_message, send_bundle_message, send_paid_message)
- `20260513000007` — fix_renewal_fee_split
- `20260513000008` — atomic_message_send
- `20260513000009` — wallet_deposit_idempotency (unique index on wallet_transactions)

**Must still be applied:**
- `20260514000001_scheduled_messages_cron.sql` — creates `process_pending_scheduled_messages()` + pg_cron job

SQL to run:
```sql
CREATE OR REPLACE FUNCTION process_pending_scheduled_messages()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  msg RECORD; processed_count INT := 0; sent_count INT := 0; failed_count INT := 0; err_msg TEXT;
BEGIN
  FOR msg IN
    SELECT * FROM public.scheduled_messages
    WHERE status = 'pending' AND scheduled_at <= NOW()
    ORDER BY scheduled_at ASC
  LOOP
    processed_count := processed_count + 1;
    BEGIN
      INSERT INTO public.messages (conversation_id, sender_id, content, message_type, voice_url, voice_duration, is_paid)
      VALUES (msg.conversation_id, msg.sender_id, msg.content, COALESCE(msg.message_type, 'text'), msg.voice_url, msg.voice_duration, true);
      UPDATE public.scheduled_messages SET status = 'sent', sent_at = NOW() WHERE id = msg.id;
      sent_count := sent_count + 1;
    EXCEPTION WHEN OTHERS THEN
      err_msg := SQLERRM;
      UPDATE public.scheduled_messages SET status = 'failed', error_message = err_msg WHERE id = msg.id;
      failed_count := failed_count + 1;
    END;
  END LOOP;
  RETURN jsonb_build_object('processed', processed_count, 'sent', sent_count, 'failed', failed_count, 'ran_at', NOW());
END; $$;

SELECT cron.schedule('process-scheduled-messages', '* * * * *', $$SELECT process_pending_scheduled_messages()$$);
```

---

## Known Gaps (Not Bugs — Feature Incomplete)

- **Promo codes** — `promo_codes` table exists and `PromoCodeManager` lets creators create them, but no checkout UI for customers to enter codes, and payment functions don't apply discounts. The feature is ~30% built. To complete: add promo code input to checkout flow, validate in `create-payment` / `create-bundle-payment` edge functions, decrement `uses_count` post-payment.
- **WelcomeMessage** — Saves to `creator_settings` correctly but there's no automatic trigger to send it when a new conversation is created. Would need a DB trigger or hook in the conversation creation flow.
- **Draft autosave** — `useMessageDrafts` hook exists but `MessagingInterface.tsx` never imports it. Wire it up if autosave is wanted.

---

## Key Edge Functions Reference

| Function | Purpose | Auth |
|----------|---------|------|
| `stripe-webhook` | Handles all Stripe events | Stripe signature |
| `create-payment` | Creates Stripe Checkout for wallet deposit | User JWT |
| `verify-wallet-payment` | Confirms deposit, credits wallet (idempotent) | User JWT |
| `create-bundle-payment` | Creates Stripe Checkout for bundle purchase | User JWT |
| `verify-bundle-payment` | Confirms bundle payment, unlocks content | User JWT |
| `create-connect-account` | Starts Stripe Connect Express onboarding | User JWT |
| `request-payout` | Creator requests payout to Stripe | User JWT |
| `check-auto-reply` | Triggers AI or legacy auto-reply after customer message | User JWT |
| `process-scheduled-messages` | Sends due scheduled messages | Service role / internal secret |
| `process-subscription-renewals` | Renews subscriptions (manual trigger) | Admin role / service key |
| `create-notification` | Inserts notification row | Service role OR user JWT (with conversation check) |
| `process-refund` | Approve/reject refund (Stripe or wallet) | Admin role |

---

## Atomic RPCs (SECURITY DEFINER — use these, not direct inserts)

| RPC | What it does |
|-----|-------------|
| `send_paid_message(...)` | Deducts wallet balance + inserts message atomically |
| `use_subscription_message(...)` | Increments usage + inserts message atomically |
| `send_bundle_message(...)` | Decrements bundle credit + inserts message atomically |
| `spend_bundle_credit(...)` | Decrements `customer_credits` (used by `useCredits` hook) |
| `process_all_subscription_renewals()` | Bulk-renews all due subscriptions (called by pg_cron daily at 02:00 UTC) |
| `process_pending_scheduled_messages()` | Sends all due scheduled messages (called by pg_cron every minute) |

---

## Git / Deploy Workflow

```bash
# If you see index.lock errors:
rm -f ~/Desktop/Coding/dmme/.git/index.lock ~/Desktop/Coding/dmme/.git/HEAD.lock

# Normal workflow:
cd ~/Desktop/Coding/dmme
git add <files>
git commit -m "fix: description"
git push   # triggers Vercel auto-deploy
```

Vercel project is connected to the `main` branch. Every push deploys automatically.
