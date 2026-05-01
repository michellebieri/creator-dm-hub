-- =============================================================
-- DM ME — Complete Database Schema
-- Paste this into Supabase SQL Editor and run it.
-- Project: jhzcmdsaajvftjbhdunt
-- =============================================================

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE public.user_role       AS ENUM ('creator', 'customer');
CREATE TYPE public.app_role        AS ENUM ('admin', 'moderator', 'creator', 'customer');
CREATE TYPE public.waitlist_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.conversation_status AS ENUM ('active', 'archived');
CREATE TYPE public.message_type    AS ENUM ('text', 'unlockable', 'voice');
CREATE TYPE public.transaction_type AS ENUM ('message', 'pack', 'unlockable');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE public.media_type      AS ENUM ('image', 'video', 'audio', 'document');
CREATE TYPE public.payout_status   AS ENUM ('pending', 'processing', 'completed', 'failed');

-- =============================================================
-- CORE UTILITY FUNCTION (needed by triggers below)
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- CORE TABLES
-- =============================================================

-- profiles ---------------------------------------------------
CREATE TABLE public.profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role             public.user_role NOT NULL DEFAULT 'customer',
  username         TEXT UNIQUE NOT NULL,
  display_name     TEXT NOT NULL,
  bio              TEXT,
  avatar_url       TEXT,
  wallet_balance   NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  stripe_customer_id TEXT,
  theme_preference TEXT DEFAULT 'system',
  language_preference TEXT DEFAULT 'en',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- creator_settings -------------------------------------------
CREATE TABLE public.creator_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  price_per_message     NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  is_accepting_messages BOOLEAN NOT NULL DEFAULT TRUE,
  waitlist_status       public.waitlist_status NOT NULL DEFAULT 'pending',
  stripe_account_id     TEXT,
  stripe_connect_status TEXT DEFAULT 'not_connected',
  bulk_message_amount   INTEGER DEFAULT 30,
  bulk_message_price    NUMERIC DEFAULT 45.00,
  first_three_free      BOOLEAN DEFAULT false,
  ai_messaging          BOOLEAN DEFAULT false,
  gift_messages         BOOLEAN DEFAULT true,
  gift_message_count    INTEGER DEFAULT 5,
  welcome_message_1     TEXT,
  welcome_message_2     TEXT,
  welcome_message_3     TEXT,
  watermark_enabled     BOOLEAN DEFAULT false,
  watermark_text        TEXT,
  social_facebook       TEXT,
  social_instagram      TEXT,
  social_tiktok         TEXT,
  social_youtube        TEXT,
  social_twitch         TEXT,
  social_twitter        TEXT,
  social_snapchat       TEXT,
  social_other_url      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.creator_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_creator_settings
  BEFORE UPDATE ON public.creator_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- conversations ----------------------------------------------
CREATE TABLE public.conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      public.conversation_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(creator_id, customer_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_conversations
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- messages ---------------------------------------------------
CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  message_type    public.message_type NOT NULL DEFAULT 'text',
  is_paid         BOOLEAN NOT NULL DEFAULT FALSE,
  voice_url       TEXT,
  voice_duration  INTEGER,
  is_forwarded    BOOLEAN NOT NULL DEFAULT false,
  forwarded_from_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_pinned       BOOLEAN NOT NULL DEFAULT false,
  pinned_at       TIMESTAMPTZ,
  pinned_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  edited_at       TIMESTAMPTZ,
  edit_count      INTEGER DEFAULT 0,
  read_at         TIMESTAMPTZ,
  read_by         UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_pinned ON public.messages(conversation_id, is_pinned, pinned_at DESC) WHERE is_pinned = true;
CREATE INDEX idx_messages_edited_at ON public.messages(edited_at) WHERE edited_at IS NOT NULL;
CREATE INDEX idx_messages_forwarded_from ON public.messages(forwarded_from_id);

-- message_packs ----------------------------------------------
CREATE TABLE public.message_packs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity            INTEGER NOT NULL,
  price               NUMERIC(10,2) NOT NULL,
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.message_packs ENABLE ROW LEVEL SECURITY;

-- transactions -----------------------------------------------
CREATE TABLE public.transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type public.transaction_type NOT NULL,
  amount           NUMERIC(10,2) NOT NULL,
  platform_fee     NUMERIC(10,2) NOT NULL DEFAULT 0,
  processor_fee    NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_amount       NUMERIC(10,2) NOT NULL,
  stripe_payment_id TEXT,
  status           public.transaction_status NOT NULL DEFAULT 'pending',
  message_id       UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  pack_id          UUID REFERENCES public.message_packs(id) ON DELETE SET NULL,
  bundle_id        UUID,  -- FK added after content_bundles is created
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- unlockables ------------------------------------------------
CREATE TABLE public.unlockables (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id          UUID NOT NULL UNIQUE REFERENCES public.messages(id) ON DELETE CASCADE,
  creator_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url           TEXT NOT NULL,
  media_type          public.media_type NOT NULL,
  price               NUMERIC(10,2) NOT NULL,
  unlocked_by         UUID[] DEFAULT ARRAY[]::UUID[],
  title               TEXT,
  caption             TEXT,
  thumbnail_url       TEXT,
  free_for_subscribers BOOLEAN DEFAULT false,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.unlockables ENABLE ROW LEVEL SECURITY;

-- payouts ----------------------------------------------------
CREATE TABLE public.payouts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount           NUMERIC(10,2) NOT NULL,
  status           public.payout_status NOT NULL DEFAULT 'pending',
  stripe_transfer_id TEXT,
  scheduled_at     TIMESTAMPTZ NOT NULL,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- customer_credits -------------------------------------------
CREATE TABLE public.customer_credits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  pack_id          UUID REFERENCES public.message_packs(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, creator_id, pack_id)
);

ALTER TABLE public.customer_credits ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_customer_credits
  BEFORE UPDATE ON public.customer_credits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- wallet_transactions ----------------------------------------
CREATE TABLE public.wallet_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount           NUMERIC(10,2) NOT NULL,
  transaction_type TEXT NOT NULL,
  description      TEXT,
  related_user_id  UUID REFERENCES public.profiles(id),
  balance_after    NUMERIC(10,2) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);

-- =============================================================
-- ROLES & AUTH
-- =============================================================

CREATE TABLE public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- =============================================================
-- SUBSCRIPTIONS
-- =============================================================

CREATE TABLE public.subscription_tiers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        UUID NOT NULL REFERENCES public.profiles(id),
  name              TEXT NOT NULL,
  description       TEXT,
  price             NUMERIC NOT NULL,
  billing_interval  TEXT NOT NULL DEFAULT 'monthly',
  features          JSONB,
  stripe_price_id   TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  discount_comment  TEXT,
  free_messages_per_month INTEGER DEFAULT 0,
  unlimited_messages BOOLEAN DEFAULT false,
  discount_percentage INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.creator_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID NOT NULL REFERENCES public.profiles(id),
  tier_id               UUID NOT NULL REFERENCES public.subscription_tiers(id),
  status                TEXT NOT NULL DEFAULT 'active',
  stripe_subscription_id TEXT,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.creator_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_subscriptions_customer ON public.creator_subscriptions(customer_id);
CREATE INDEX idx_subscriptions_tier ON public.creator_subscriptions(tier_id);

CREATE TABLE public.subscription_message_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.creator_subscriptions(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start    TIMESTAMPTZ NOT NULL,
  period_end      TIMESTAMPTZ NOT NULL,
  messages_used   INTEGER NOT NULL DEFAULT 0,
  messages_allowed INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subscription_id, period_start)
);

ALTER TABLE public.subscription_message_usage ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- PAYMENTS & PLATFORM
-- =============================================================

CREATE TABLE public.platform_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_fee_percentage NUMERIC NOT NULL DEFAULT 20.00,
  platform_stripe_account_id TEXT,
  platform_owner_user_id  UUID REFERENCES public.profiles(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.platform_fees (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id            UUID REFERENCES public.transactions(id),
  creator_id                UUID NOT NULL REFERENCES public.profiles(id),
  gross_amount              NUMERIC NOT NULL,
  platform_fee_amount       NUMERIC NOT NULL,
  creator_net_amount        NUMERIC NOT NULL,
  stripe_transfer_id        TEXT,
  stripe_application_fee_id TEXT,
  status                    TEXT NOT NULL DEFAULT 'pending',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at              TIMESTAMPTZ
);

ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payment_methods (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL UNIQUE,
  last4                   TEXT NOT NULL,
  brand                   TEXT NOT NULL,
  exp_month               INTEGER NOT NULL,
  exp_year                INTEGER NOT NULL,
  is_default              BOOLEAN DEFAULT false,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_payment_methods_user_id ON public.payment_methods(user_id);

CREATE TABLE public.tips (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipper_id        UUID NOT NULL REFERENCES public.profiles(id),
  creator_id       UUID NOT NULL REFERENCES public.profiles(id),
  amount           NUMERIC NOT NULL,
  message          TEXT,
  stripe_payment_id TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_tips_creator ON public.tips(creator_id);
CREATE INDEX idx_tips_tipper ON public.tips(tipper_id);

CREATE TABLE public.refunds (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id),
  amount         NUMERIC NOT NULL,
  reason         TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',
  stripe_refund_id TEXT,
  processed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.promo_codes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id     UUID NOT NULL REFERENCES public.profiles(id),
  code           TEXT NOT NULL UNIQUE,
  discount_type  TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL,
  max_uses       INTEGER,
  uses_count     INTEGER NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.vip_pricing (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id                  UUID NOT NULL REFERENCES public.profiles(id),
  customer_id                 UUID NOT NULL REFERENCES public.profiles(id),
  custom_price_per_message    NUMERIC,
  custom_unlockable_discount  NUMERIC,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(creator_id, customer_id)
);

ALTER TABLE public.vip_pricing ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- CONTENT
-- =============================================================

CREATE TABLE public.content_bundles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  price               NUMERIC NOT NULL,
  original_price      NUMERIC DEFAULT 0.00,
  discount_percentage NUMERIC DEFAULT 0,
  messages_included   INTEGER DEFAULT 0,
  is_active           BOOLEAN DEFAULT true,
  thumbnail_url       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.content_bundles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_content_bundles_creator ON public.content_bundles(creator_id) WHERE is_active = true;

-- Now add FK from transactions to content_bundles
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_bundle_id_fkey
  FOREIGN KEY (bundle_id) REFERENCES public.content_bundles(id);

CREATE INDEX idx_transactions_bundle_id ON public.transactions(bundle_id);

CREATE TABLE public.bundle_contents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id     UUID NOT NULL REFERENCES public.content_bundles(id) ON DELETE CASCADE,
  unlockable_id UUID NOT NULL REFERENCES public.unlockables(id) ON DELETE CASCADE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bundle_id, unlockable_id)
);

ALTER TABLE public.bundle_contents ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_bundle_contents_bundle ON public.bundle_contents(bundle_id);
CREATE INDEX idx_bundle_contents_unlockable ON public.bundle_contents(unlockable_id);

CREATE TABLE public.content_collections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id   UUID NOT NULL REFERENCES public.profiles(id),
  title        TEXT NOT NULL,
  description  TEXT,
  thumbnail_url TEXT,
  is_public    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.content_collections ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.collection_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.content_collections(id) ON DELETE CASCADE,
  unlockable_id UUID NOT NULL REFERENCES public.unlockables(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collection_id, unlockable_id)
);

ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.content_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.content_tags ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.content_tag_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unlockable_id UUID NOT NULL REFERENCES public.unlockables(id) ON DELETE CASCADE,
  tag_id        UUID NOT NULL REFERENCES public.content_tags(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unlockable_id, tag_id)
);

ALTER TABLE public.content_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.content_likes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unlockable_id UUID NOT NULL REFERENCES public.unlockables(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, unlockable_id)
);

ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_content_likes_user ON public.content_likes(user_id);
CREATE INDEX idx_content_likes_unlockable ON public.content_likes(unlockable_id);

CREATE TABLE public.content_comments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unlockable_id     UUID NOT NULL REFERENCES public.unlockables(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.profiles(id),
  comment           TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.content_comments(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_comments_unlockable ON public.content_comments(unlockable_id);

-- =============================================================
-- MESSAGING EXTRAS
-- =============================================================

CREATE TABLE public.message_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id, reaction)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);

CREATE TABLE public.message_bookmarks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

ALTER TABLE public.message_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_message_bookmarks_user_id ON public.message_bookmarks(user_id);
CREATE INDEX idx_message_bookmarks_created_at ON public.message_bookmarks(created_at DESC);

CREATE TABLE public.scheduled_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  message_type    TEXT NOT NULL DEFAULT 'text',
  voice_url       TEXT,
  voice_duration  INTEGER,
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'))
);

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_scheduled_messages_scheduled_at ON public.scheduled_messages(scheduled_at, status);
CREATE INDEX idx_scheduled_messages_sender_id ON public.scheduled_messages(sender_id);

CREATE TABLE public.message_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_message_templates_creator ON public.message_templates(creator_id);

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.conversation_labels (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.conversation_labels ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_conversation_labels_user_id ON public.conversation_labels(user_id);

CREATE TABLE public.conversation_label_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  label_id        UUID NOT NULL REFERENCES public.conversation_labels(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, label_id)
);

ALTER TABLE public.conversation_label_assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_conversation_label_assignments_conversation_id ON public.conversation_label_assignments(conversation_id);
CREATE INDEX idx_conversation_label_assignments_label_id ON public.conversation_label_assignments(label_id);

CREATE TABLE public.auto_replies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  message          TEXT NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT false,
  trigger_condition TEXT NOT NULL DEFAULT 'always',
  schedule_start   TIME,
  schedule_end     TIME,
  days_active      TEXT[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.auto_replies ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_auto_replies_creator ON public.auto_replies(creator_id) WHERE is_active = true;

CREATE TRIGGER update_auto_replies_updated_at
  BEFORE UPDATE ON public.auto_replies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================
-- SOCIAL & COMMUNITY
-- =============================================================

CREATE TABLE public.user_follows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON public.user_follows(following_id);

CREATE TABLE public.user_blocks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON public.user_blocks(blocked_id);

CREATE TABLE public.user_reports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  reason             TEXT NOT NULL,
  description        TEXT,
  status             TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_at        TIMESTAMPTZ,
  reviewed_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_reports_reporter ON public.user_reports(reporter_id);
CREATE INDEX idx_user_reports_status ON public.user_reports(status);

CREATE TABLE public.wishlists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES public.profiles(id),
  unlockable_id UUID NOT NULL REFERENCES public.unlockables(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, unlockable_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_wishlists_customer ON public.wishlists(customer_id);

CREATE TABLE public.referrals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   UUID NOT NULL REFERENCES public.profiles(id),
  referred_id   UUID NOT NULL REFERENCES public.profiles(id),
  referral_code TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  reward_amount NUMERIC DEFAULT 0,
  reward_paid   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at  TIMESTAMPTZ
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);

-- =============================================================
-- NOTIFICATIONS & ACTIVITY
-- =============================================================

CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

CREATE TABLE public.push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.activity_feed (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('message','purchase','subscription','tip','comment','follow','content_upload')),
  content       TEXT NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_activity_feed_user_created ON public.activity_feed(user_id, created_at DESC);

-- =============================================================
-- USER PREFERENCES & SESSIONS
-- =============================================================

CREATE TABLE public.email_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  new_message     BOOLEAN DEFAULT true,
  new_subscriber  BOOLEAN DEFAULT true,
  new_purchase    BOOLEAN DEFAULT true,
  new_tip         BOOLEAN DEFAULT true,
  new_comment     BOOLEAN DEFAULT true,
  new_follower    BOOLEAN DEFAULT true,
  promotional     BOOLEAN DEFAULT false,
  weekly_summary  BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.user_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_name TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_sessions_user ON public.user_sessions(user_id);

-- =============================================================
-- ANALYTICS & ADMIN
-- =============================================================

CREATE TABLE public.profile_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_profile_views_profile ON public.profile_views(profile_id);
CREATE INDEX idx_profile_views_created ON public.profile_views(created_at);

CREATE TABLE public.traffic_sources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id),
  source       TEXT,
  medium       TEXT,
  campaign     TEXT,
  referrer     TEXT,
  landing_page TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.traffic_sources ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_traffic_sources_user ON public.traffic_sources(user_id);

CREATE TABLE public.pricing_experiments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          UUID NOT NULL REFERENCES public.profiles(id),
  content_type        TEXT NOT NULL,
  variant_a_price     NUMERIC NOT NULL,
  variant_b_price     NUMERIC NOT NULL,
  variant_a_conversions INTEGER DEFAULT 0,
  variant_b_conversions INTEGER DEFAULT 0,
  variant_a_views     INTEGER DEFAULT 0,
  variant_b_views     INTEGER DEFAULT 0,
  winner              TEXT,
  status              TEXT NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at            TIMESTAMPTZ
);

ALTER TABLE public.pricing_experiments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.promotion_campaigns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          UUID NOT NULL REFERENCES public.profiles(id),
  title               TEXT NOT NULL,
  description         TEXT,
  discount_percentage NUMERIC NOT NULL,
  target_segment      TEXT,
  start_date          TIMESTAMPTZ NOT NULL,
  end_date            TIMESTAMPTZ NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.promotion_campaigns ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.customer_segments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id     UUID NOT NULL REFERENCES public.profiles(id),
  name           TEXT NOT NULL,
  criteria       JSONB NOT NULL,
  customer_count INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES public.profiles(id),
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   UUID,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- VERIFICATION & COMPLIANCE
-- =============================================================

CREATE TABLE public.age_verifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE REFERENCES public.profiles(id),
  verified_at         TIMESTAMPTZ,
  verification_method TEXT,
  document_type       TEXT,
  status              TEXT NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.age_verifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.creator_verifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  verified_at      TIMESTAMPTZ,
  submitted_at     TIMESTAMPTZ DEFAULT NOW(),
  documents_url    TEXT,
  rejection_reason TEXT,
  reviewed_by      UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.creator_verifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.dmca_claims (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unlockable_id  UUID NOT NULL REFERENCES public.unlockables(id),
  claimant_name  TEXT NOT NULL,
  claimant_email TEXT NOT NULL,
  description    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  reviewed_by    UUID REFERENCES public.profiles(id),
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dmca_claims ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- INFRASTRUCTURE
-- =============================================================

CREATE TABLE public.rate_limits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address    TEXT,
  endpoint      TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start  TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_rate_limits_user_endpoint ON public.rate_limits(user_id, endpoint, window_start);
CREATE INDEX idx_rate_limits_ip_endpoint ON public.rate_limits(ip_address, endpoint, window_start);

CREATE TABLE public.processed_webhook_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     TEXT NOT NULL UNIQUE,
  event_type   TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_processed_webhook_events_event_id ON public.processed_webhook_events(event_id);
CREATE INDEX idx_processed_webhook_events_created_at ON public.processed_webhook_events(created_at);

-- =============================================================
-- FUNCTIONS
-- =============================================================

-- Role check (security definer so RLS can call it without recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-generate username if blank
CREATE OR REPLACE FUNCTION public.ensure_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    NEW.username := LOWER(REPLACE(REPLACE(
      COALESCE(NEW.display_name, 'user_' || substr(NEW.id::text, 1, 8)),
      ' ', '_'), '-', '_'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER ensure_username_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_username();

-- Create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public','auth'
AS $$
DECLARE
  v_user_role public.user_role;
  v_app_role  public.app_role;
BEGIN
  -- Always default to 'customer' regardless of metadata
  v_user_role := 'customer';
  v_app_role  := 'customer';

  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
    v_user_role
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_app_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic wallet spend (prevents race conditions)
CREATE OR REPLACE FUNCTION public.spend_wallet_balance(
  p_user_id UUID, p_amount NUMERIC, p_transaction_type TEXT,
  p_description TEXT, p_related_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance     NUMERIC;
BEGIN
  SELECT wallet_balance INTO v_current_balance
  FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'Insufficient balance',
      'current_balance', v_current_balance, 'required_amount', p_amount
    );
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE profiles SET wallet_balance = v_new_balance WHERE id = p_user_id;

  INSERT INTO wallet_transactions (user_id, amount, transaction_type, description, related_user_id, balance_after)
  VALUES (p_user_id, -p_amount, p_transaction_type, p_description, p_related_user_id, v_new_balance);

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'amount_spent', p_amount);
END;
$$;

-- Atomic credit spend
CREATE OR REPLACE FUNCTION public.spend_bundle_credit(p_customer_id UUID, p_creator_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_credits_remaining INTEGER;
  v_credit_id         UUID;
BEGIN
  SELECT id, credits_remaining INTO v_credit_id, v_credits_remaining
  FROM customer_credits
  WHERE customer_id = p_customer_id AND creator_id = p_creator_id AND credits_remaining > 0
  ORDER BY created_at ASC LIMIT 1 FOR UPDATE;

  IF v_credit_id IS NULL OR v_credits_remaining <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No credits remaining');
  END IF;

  UPDATE customer_credits SET credits_remaining = v_credits_remaining - 1, updated_at = NOW()
  WHERE id = v_credit_id;

  RETURN jsonb_build_object('success', true, 'remaining', v_credits_remaining - 1, 'credit_id', v_credit_id);
END;
$$;

-- Atomic subscription message spend
CREATE OR REPLACE FUNCTION public.spend_subscription_message(
  p_subscription_id UUID, p_customer_id UUID, p_creator_id UUID,
  p_period_start TIMESTAMPTZ, p_period_end TIMESTAMPTZ, p_messages_allowed INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_messages_used INTEGER;
  v_usage_id      UUID;
BEGIN
  SELECT id, messages_used INTO v_usage_id, v_messages_used
  FROM subscription_message_usage
  WHERE subscription_id = p_subscription_id AND period_start = p_period_start
  FOR UPDATE;

  IF v_usage_id IS NULL THEN
    INSERT INTO subscription_message_usage
      (subscription_id, customer_id, creator_id, period_start, period_end, messages_used, messages_allowed)
    VALUES (p_subscription_id, p_customer_id, p_creator_id, p_period_start, p_period_end, 1, p_messages_allowed)
    RETURNING id INTO v_usage_id;
    RETURN jsonb_build_object('success', true, 'remaining', p_messages_allowed - 1, 'usage_id', v_usage_id);
  END IF;

  IF v_messages_used >= p_messages_allowed THEN
    RETURN jsonb_build_object('success', false, 'error', 'No messages remaining');
  END IF;

  UPDATE subscription_message_usage SET messages_used = v_messages_used + 1, updated_at = NOW()
  WHERE id = v_usage_id;

  RETURN jsonb_build_object('success', true, 'remaining', p_messages_allowed - v_messages_used - 1, 'usage_id', v_usage_id);
END;
$$;

-- Safe public profile accessor (no wallet_balance, no stripe fields)
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id UUID)
RETURNS TABLE (id UUID, username TEXT, display_name TEXT, avatar_url TEXT, bio TEXT, role public.user_role, created_at TIMESTAMPTZ)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.bio, p.role, p.created_at
  FROM public.profiles p WHERE p.id = profile_id
$$;

-- Safe creator pricing accessor (no Stripe account details)
CREATE OR REPLACE FUNCTION public.get_creator_pricing(creator_id UUID)
RETURNS TABLE (user_id UUID, price_per_message NUMERIC, is_accepting_messages BOOLEAN,
               bulk_message_amount INTEGER, bulk_message_price NUMERIC, first_three_free BOOLEAN,
               gift_messages BOOLEAN, gift_message_count INTEGER)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT cs.user_id, cs.price_per_message, cs.is_accepting_messages,
         cs.bulk_message_amount, cs.bulk_message_price, cs.first_three_free,
         cs.gift_messages, cs.gift_message_count
  FROM public.creator_settings cs WHERE cs.user_id = creator_id
$$;

-- Creator search (safe fields only)
CREATE OR REPLACE FUNCTION public.search_creators(search_query TEXT DEFAULT NULL)
RETURNS TABLE (id UUID, username TEXT, display_name TEXT, avatar_url TEXT, bio TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.bio
  FROM public.profiles p
  WHERE p.role = 'creator'
  AND (search_query IS NULL OR p.username ILIKE '%' || search_query || '%'
       OR p.display_name ILIKE '%' || search_query || '%')
  ORDER BY p.display_name LIMIT 100
$$;

-- All creators for browse page
CREATE OR REPLACE FUNCTION public.get_public_creators()
RETURNS TABLE (id UUID, username TEXT, display_name TEXT, avatar_url TEXT, bio TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.bio
  FROM public.profiles p WHERE p.role = 'creator'
  ORDER BY p.created_at DESC
$$;

-- Safe conversation partner info
CREATE OR REPLACE FUNCTION public.get_conversation_partner(partner_id UUID)
RETURNS TABLE (id UUID, username TEXT, display_name TEXT, avatar_url TEXT, bio TEXT, role public.user_role)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.bio, p.role
  FROM public.profiles p
  WHERE p.id = partner_id
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.creator_id = partner_id OR c.customer_id = partner_id)
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  )
$$;

-- Check if caller is platform owner
CREATE OR REPLACE FUNCTION public.check_is_platform_owner()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_config
    WHERE platform_owner_user_id = auth.uid() LIMIT 1
  )
$$;

-- payment_methods updated_at trigger
CREATE OR REPLACE FUNCTION public.update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_payment_methods_updated_at();

-- =============================================================
-- VIEWS
-- =============================================================

-- Public creator profile data (no wallet, no stripe)
CREATE VIEW public.public_profiles WITH (security_invoker = true) AS
SELECT id, username, display_name, avatar_url, bio, role, created_at
FROM public.profiles WHERE role = 'creator';

GRANT SELECT ON public.public_profiles TO authenticated, anon;
COMMENT ON VIEW public.public_profiles IS 'Creator profiles — excludes wallet_balance and stripe_customer_id';

-- Content discovery (no media_url)
CREATE VIEW public.unlockables_discovery WITH (security_invoker = true) AS
SELECT id, creator_id, media_type, price, title, caption, thumbnail_url,
       free_for_subscribers, created_at, expires_at
FROM public.unlockables;

GRANT SELECT ON public.unlockables_discovery TO authenticated, anon;

-- Safe platform config (fee % only)
CREATE VIEW public.platform_public_config WITH (security_invoker = true) AS
SELECT platform_fee_percentage FROM public.platform_config LIMIT 1;

GRANT SELECT ON public.platform_public_config TO authenticated, anon;

-- =============================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================

-- profiles ---------------------------------------------------
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_conversation_partner"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.creator_id = profiles.id OR c.customer_id = profiles.id)
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  ));

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- creator_settings -------------------------------------------
CREATE POLICY "creator_settings_select_own"
  ON public.creator_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "creator_settings_insert_own"
  ON public.creator_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "creator_settings_update_own"
  ON public.creator_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- conversations ----------------------------------------------
CREATE POLICY "conversations_select"
  ON public.conversations FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = customer_id);

CREATE POLICY "conversations_insert"
  ON public.conversations FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "conversations_update"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = customer_id);

-- messages ---------------------------------------------------
CREATE POLICY "messages_select"
  ON public.messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  ));

CREATE POLICY "messages_insert"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  ));

CREATE POLICY "messages_update"
  ON public.messages FOR UPDATE USING (auth.uid() = sender_id);

-- message_packs ----------------------------------------------
CREATE POLICY "message_packs_select_active"
  ON public.message_packs FOR SELECT USING (is_active = true);

CREATE POLICY "message_packs_all_owner"
  ON public.message_packs FOR ALL USING (auth.uid() = creator_id);

-- transactions -----------------------------------------------
CREATE POLICY "transactions_select_own"
  ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = creator_id);

CREATE POLICY "transactions_insert_service"
  ON public.transactions FOR INSERT TO service_role WITH CHECK (true);

-- unlockables ------------------------------------------------
CREATE POLICY "unlockables_select_creator"
  ON public.unlockables FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "unlockables_select_purchaser"
  ON public.unlockables FOR SELECT USING (auth.uid() = ANY(unlocked_by));

CREATE POLICY "unlockables_select_conversation"
  ON public.unlockables FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE m.id = unlockables.message_id
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  ));

CREATE POLICY "unlockables_insert"
  ON public.unlockables FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "unlockables_update_own"
  ON public.unlockables FOR UPDATE TO authenticated USING (auth.uid() = creator_id);

CREATE POLICY "unlockables_delete_own"
  ON public.unlockables FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- payouts ----------------------------------------------------
CREATE POLICY "payouts_select_own"
  ON public.payouts FOR SELECT USING (auth.uid() = creator_id);

-- customer_credits -------------------------------------------
CREATE POLICY "customer_credits_select"
  ON public.customer_credits FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = creator_id);

CREATE POLICY "customer_credits_insert_service"
  ON public.customer_credits FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "customer_credits_update_service"
  ON public.customer_credits FOR UPDATE TO service_role USING (true);

-- wallet_transactions ----------------------------------------
CREATE POLICY "wallet_transactions_select_own"
  ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wallet_transactions_insert"
  ON public.wallet_transactions FOR INSERT WITH CHECK (true);

-- user_roles -------------------------------------------------
CREATE POLICY "user_roles_select_own"
  ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_roles_select_creator"
  ON public.user_roles FOR SELECT USING (role = 'creator');

CREATE POLICY "user_roles_insert_admin"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_delete_admin"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- payment_methods --------------------------------------------
CREATE POLICY "payment_methods_select_own"
  ON public.payment_methods FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "payment_methods_insert_own"
  ON public.payment_methods FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "payment_methods_update_own"
  ON public.payment_methods FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "payment_methods_delete_own"
  ON public.payment_methods FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- platform_config --------------------------------------------
CREATE POLICY "platform_config_select_owner"
  ON public.platform_config FOR SELECT USING (platform_owner_user_id = auth.uid());

CREATE POLICY "platform_config_update_owner"
  ON public.platform_config FOR UPDATE USING (platform_owner_user_id = auth.uid());

-- platform_fees ----------------------------------------------
CREATE POLICY "platform_fees_select_creator"
  ON public.platform_fees FOR SELECT USING (creator_id = auth.uid());

CREATE POLICY "platform_fees_select_owner"
  ON public.platform_fees FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.platform_config WHERE platform_owner_user_id = auth.uid()));

CREATE POLICY "platform_fees_insert_service"
  ON public.platform_fees FOR INSERT WITH CHECK (true);

CREATE POLICY "platform_fees_update_service"
  ON public.platform_fees FOR UPDATE USING (true);

-- rate_limits ------------------------------------------------
CREATE POLICY "rate_limits_service"
  ON public.rate_limits FOR ALL USING (true) WITH CHECK (true);

-- notifications ----------------------------------------------
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_system"
  ON public.notifications FOR INSERT WITH CHECK (true);

-- push_subscriptions -----------------------------------------
CREATE POLICY "push_subscriptions_select_own"
  ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_insert_own"
  ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_delete_own"
  ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- tips -------------------------------------------------------
CREATE POLICY "tips_select_own"
  ON public.tips FOR SELECT USING (auth.uid() = tipper_id OR auth.uid() = creator_id);

CREATE POLICY "tips_insert_own"
  ON public.tips FOR INSERT WITH CHECK (auth.uid() = tipper_id);

-- subscription_tiers -----------------------------------------
CREATE POLICY "subscription_tiers_select_active"
  ON public.subscription_tiers FOR SELECT USING (is_active = true);

CREATE POLICY "subscription_tiers_all_creator"
  ON public.subscription_tiers FOR ALL USING (auth.uid() = creator_id);

-- creator_subscriptions --------------------------------------
CREATE POLICY "creator_subscriptions_select"
  ON public.creator_subscriptions FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() IN (
    SELECT creator_id FROM public.subscription_tiers WHERE id = tier_id
  ));

CREATE POLICY "creator_subscriptions_insert"
  ON public.creator_subscriptions FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- subscription_message_usage ---------------------------------
CREATE POLICY "sub_message_usage_select"
  ON public.subscription_message_usage FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = creator_id);

CREATE POLICY "sub_message_usage_insert"
  ON public.subscription_message_usage FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "sub_message_usage_update"
  ON public.subscription_message_usage FOR UPDATE USING (auth.uid() = customer_id);

-- refunds ----------------------------------------------------
CREATE POLICY "refunds_select"
  ON public.refunds FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
    AND (t.customer_id = auth.uid() OR t.creator_id = auth.uid())
  ));

-- promo_codes ------------------------------------------------
CREATE POLICY "promo_codes_select_active"
  ON public.promo_codes FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "promo_codes_all_creator"
  ON public.promo_codes FOR ALL USING (auth.uid() = creator_id);

-- vip_pricing ------------------------------------------------
CREATE POLICY "vip_pricing_creator"
  ON public.vip_pricing FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY "vip_pricing_customer_select"
  ON public.vip_pricing FOR SELECT USING (auth.uid() = customer_id);

-- content_bundles --------------------------------------------
CREATE POLICY "content_bundles_creator"
  ON public.content_bundles FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY "content_bundles_select_active"
  ON public.content_bundles FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- bundle_contents --------------------------------------------
CREATE POLICY "bundle_contents_select"
  ON public.bundle_contents FOR SELECT TO authenticated USING (true);

CREATE POLICY "bundle_contents_creator"
  ON public.bundle_contents FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.content_bundles cb
    WHERE cb.id = bundle_id AND cb.creator_id = auth.uid()
  ));

-- content_collections ----------------------------------------
CREATE POLICY "content_collections_creator"
  ON public.content_collections FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY "content_collections_select_public"
  ON public.content_collections FOR SELECT USING (is_public = true);

-- collection_items -------------------------------------------
CREATE POLICY "collection_items_select"
  ON public.collection_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.content_collections cc
    WHERE cc.id = collection_id AND (cc.is_public = true OR cc.creator_id = auth.uid())
  ));

CREATE POLICY "collection_items_creator"
  ON public.collection_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.content_collections cc
    WHERE cc.id = collection_id AND cc.creator_id = auth.uid()
  ));

-- content_tags -----------------------------------------------
CREATE POLICY "content_tags_select" ON public.content_tags FOR SELECT USING (true);
CREATE POLICY "content_tags_insert" ON public.content_tags FOR INSERT WITH CHECK (true);

-- content_tag_assignments ------------------------------------
CREATE POLICY "content_tag_assignments_select" ON public.content_tag_assignments FOR SELECT USING (true);
CREATE POLICY "content_tag_assignments_creator"
  ON public.content_tag_assignments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.unlockables u
    WHERE u.id = unlockable_id AND u.creator_id = auth.uid()
  ));

-- content_likes ----------------------------------------------
CREATE POLICY "content_likes_select"
  ON public.content_likes FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.unlockables u
    WHERE u.id = unlockable_id AND u.creator_id = auth.uid()
  ));

CREATE POLICY "content_likes_insert" ON public.content_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "content_likes_delete" ON public.content_likes FOR DELETE USING (auth.uid() = user_id);

-- content_comments -------------------------------------------
CREATE POLICY "content_comments_select"
  ON public.content_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.unlockables u
    WHERE u.id = unlockable_id
    AND (u.creator_id = auth.uid() OR auth.uid() = ANY(u.unlocked_by))
  ));

CREATE POLICY "content_comments_insert"
  ON public.content_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.unlockables u
    WHERE u.id = unlockable_id AND auth.uid() = ANY(u.unlocked_by)
  ));

CREATE POLICY "content_comments_update" ON public.content_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "content_comments_delete" ON public.content_comments FOR DELETE USING (auth.uid() = user_id);

-- message_reactions ------------------------------------------
CREATE POLICY "message_reactions_select"
  ON public.message_reactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE m.id = message_id
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  ));

CREATE POLICY "message_reactions_insert"
  ON public.message_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE m.id = message_id
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  ));

CREATE POLICY "message_reactions_delete" ON public.message_reactions FOR DELETE USING (auth.uid() = user_id);

-- message_bookmarks ------------------------------------------
CREATE POLICY "message_bookmarks_all" ON public.message_bookmarks FOR ALL USING (auth.uid() = user_id);

-- scheduled_messages -----------------------------------------
CREATE POLICY "scheduled_messages_select" ON public.scheduled_messages FOR SELECT USING (auth.uid() = sender_id);

CREATE POLICY "scheduled_messages_insert"
  ON public.scheduled_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND c.creator_id = auth.uid()
  ));

CREATE POLICY "scheduled_messages_update" ON public.scheduled_messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "scheduled_messages_delete" ON public.scheduled_messages FOR DELETE USING (auth.uid() = sender_id);

-- message_templates ------------------------------------------
CREATE POLICY "message_templates_all" ON public.message_templates FOR ALL USING (auth.uid() = creator_id);

-- conversation_labels ----------------------------------------
CREATE POLICY "conversation_labels_all" ON public.conversation_labels FOR ALL USING (auth.uid() = user_id);

-- conversation_label_assignments -----------------------------
CREATE POLICY "conversation_label_assignments_select"
  ON public.conversation_label_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  ));

CREATE POLICY "conversation_label_assignments_insert"
  ON public.conversation_label_assignments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  ));

CREATE POLICY "conversation_label_assignments_delete"
  ON public.conversation_label_assignments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  ));

-- auto_replies -----------------------------------------------
CREATE POLICY "auto_replies_all" ON public.auto_replies FOR ALL USING (auth.uid() = creator_id);

-- user_follows -----------------------------------------------
CREATE POLICY "user_follows_select"
  ON public.user_follows FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "user_follows_insert" ON public.user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "user_follows_delete" ON public.user_follows FOR DELETE USING (auth.uid() = follower_id);

-- user_blocks ------------------------------------------------
CREATE POLICY "user_blocks_all" ON public.user_blocks FOR ALL USING (auth.uid() = blocker_id);

-- user_reports -----------------------------------------------
CREATE POLICY "user_reports_select" ON public.user_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "user_reports_insert" ON public.user_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- wishlists --------------------------------------------------
CREATE POLICY "wishlists_all" ON public.wishlists FOR ALL USING (auth.uid() = customer_id);

-- referrals --------------------------------------------------
CREATE POLICY "referrals_select" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "referrals_insert" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- promotion_campaigns ----------------------------------------
CREATE POLICY "promotion_campaigns_all" ON public.promotion_campaigns FOR ALL USING (auth.uid() = creator_id);

-- customer_segments ------------------------------------------
CREATE POLICY "customer_segments_all" ON public.customer_segments FOR ALL USING (auth.uid() = creator_id);

-- pricing_experiments ----------------------------------------
CREATE POLICY "pricing_experiments_all" ON public.pricing_experiments FOR ALL USING (auth.uid() = creator_id);

-- activity_feed ----------------------------------------------
CREATE POLICY "activity_feed_select" ON public.activity_feed FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "activity_feed_insert" ON public.activity_feed FOR INSERT WITH CHECK (true);

-- email_preferences ------------------------------------------
CREATE POLICY "email_preferences_select" ON public.email_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "email_preferences_insert" ON public.email_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "email_preferences_update" ON public.email_preferences FOR UPDATE USING (auth.uid() = user_id);

-- user_sessions ----------------------------------------------
CREATE POLICY "user_sessions_select" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_sessions_delete" ON public.user_sessions FOR DELETE USING (auth.uid() = user_id);

-- profile_views ----------------------------------------------
CREATE POLICY "profile_views_select" ON public.profile_views FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "profile_views_insert" ON public.profile_views FOR INSERT WITH CHECK (true);

-- traffic_sources --------------------------------------------
CREATE POLICY "traffic_sources_select" ON public.traffic_sources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "traffic_sources_insert" ON public.traffic_sources FOR INSERT WITH CHECK (true);

-- age_verifications ------------------------------------------
CREATE POLICY "age_verifications_select" ON public.age_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "age_verifications_insert" ON public.age_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- creator_verifications --------------------------------------
CREATE POLICY "creator_verifications_select" ON public.creator_verifications FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "creator_verifications_insert" ON public.creator_verifications FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "creator_verifications_update" ON public.creator_verifications FOR UPDATE USING (auth.uid() = creator_id AND status = 'pending');

-- dmca_claims ------------------------------------------------
CREATE POLICY "dmca_claims_insert" ON public.dmca_claims FOR INSERT WITH CHECK (true);
CREATE POLICY "dmca_claims_select_creator"
  ON public.dmca_claims FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.unlockables u
    WHERE u.id = unlockable_id AND u.creator_id = auth.uid()
  ));

-- audit_logs -------------------------------------------------
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================
-- REALTIME
-- =============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =============================================================
-- STORAGE BUCKETS
-- =============================================================

INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true),
         ('unlockables', 'unlockables', true)
  ON CONFLICT (id) DO NOTHING;

-- Avatar policies
CREATE POLICY "avatars_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Unlockables policies
CREATE POLICY "unlockables_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'unlockables' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "unlockables_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'unlockables' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "unlockables_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'unlockables' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "unlockables_public_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'unlockables');

-- =============================================================
-- SEED: default platform config
-- =============================================================

INSERT INTO public.platform_config (platform_fee_percentage)
  VALUES (20.00) ON CONFLICT DO NOTHING;
