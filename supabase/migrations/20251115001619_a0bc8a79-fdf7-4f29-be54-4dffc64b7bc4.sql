-- Tips System
CREATE TABLE public.tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipper_id UUID NOT NULL REFERENCES public.profiles(id),
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL,
  message TEXT,
  stripe_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tips they sent or received"
  ON public.tips FOR SELECT
  USING (auth.uid() = tipper_id OR auth.uid() = creator_id);

CREATE POLICY "Users can create tips"
  ON public.tips FOR INSERT
  WITH CHECK (auth.uid() = tipper_id);

-- Subscription Tiers
CREATE TABLE public.subscription_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  features JSONB,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active subscription tiers"
  ON public.subscription_tiers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Creators can manage own subscription tiers"
  ON public.subscription_tiers FOR ALL
  USING (auth.uid() = creator_id);

-- Creator Subscriptions
CREATE TABLE public.creator_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  tier_id UUID NOT NULL REFERENCES public.subscription_tiers(id),
  status TEXT NOT NULL DEFAULT 'active',
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.creator_subscriptions FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() IN (
    SELECT creator_id FROM subscription_tiers WHERE id = tier_id
  ));

-- Promo Codes
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promo codes"
  ON public.promo_codes FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Creators can manage own promo codes"
  ON public.promo_codes FOR ALL
  USING (auth.uid() = creator_id);

-- Refunds
CREATE TABLE public.refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id),
  amount NUMERIC NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_refund_id TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view refunds for their transactions"
  ON public.refunds FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transaction_id AND (t.customer_id = auth.uid() OR t.creator_id = auth.uid())
  ));

-- VIP Pricing
CREATE TABLE public.vip_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  custom_price_per_message NUMERIC,
  custom_unlockable_discount NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(creator_id, customer_id)
);

ALTER TABLE public.vip_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage VIP pricing"
  ON public.vip_pricing FOR ALL
  USING (auth.uid() = creator_id);

CREATE POLICY "VIP customers can view their pricing"
  ON public.vip_pricing FOR SELECT
  USING (auth.uid() = customer_id);

-- Content Collections
CREATE TABLE public.content_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage own collections"
  ON public.content_collections FOR ALL
  USING (auth.uid() = creator_id);

CREATE POLICY "Public collections viewable by everyone"
  ON public.content_collections FOR SELECT
  USING (is_public = true);

-- Collection Items
CREATE TABLE public.collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.content_collections(id) ON DELETE CASCADE,
  unlockable_id UUID NOT NULL REFERENCES public.unlockables(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(collection_id, unlockable_id)
);

ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view collection items"
  ON public.collection_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM content_collections cc
    WHERE cc.id = collection_id AND (cc.is_public = true OR cc.creator_id = auth.uid())
  ));

CREATE POLICY "Creators can manage collection items"
  ON public.collection_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM content_collections cc
    WHERE cc.id = collection_id AND cc.creator_id = auth.uid()
  ));

-- Content Comments
CREATE TABLE public.content_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unlockable_id UUID NOT NULL REFERENCES public.unlockables(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  comment TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.content_comments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on unlocked content"
  ON public.content_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM unlockables u
    WHERE u.id = unlockable_id AND (u.creator_id = auth.uid() OR auth.uid() = ANY(u.unlocked_by))
  ));

CREATE POLICY "Users can create comments on unlocked content"
  ON public.content_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM unlockables u
    WHERE u.id = unlockable_id AND auth.uid() = ANY(u.unlocked_by)
  ));

CREATE POLICY "Users can update own comments"
  ON public.content_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.content_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Age Verification
CREATE TABLE public.age_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) UNIQUE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_method TEXT,
  document_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.age_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verification"
  ON public.age_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create verification request"
  ON public.age_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DMCA Claims
CREATE TABLE public.dmca_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unlockable_id UUID NOT NULL REFERENCES public.unlockables(id),
  claimant_name TEXT NOT NULL,
  claimant_email TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dmca_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit DMCA claims"
  ON public.dmca_claims FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Creators can view claims on their content"
  ON public.dmca_claims FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM unlockables u
    WHERE u.id = unlockable_id AND u.creator_id = auth.uid()
  ));

-- Audit Logs
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'creator'
  ));

-- Wishlists
CREATE TABLE public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  unlockable_id UUID NOT NULL REFERENCES public.unlockables(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, unlockable_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wishlist"
  ON public.wishlists FOR ALL
  USING (auth.uid() = customer_id);

-- Referrals
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id),
  referred_id UUID NOT NULL REFERENCES public.profiles(id),
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_amount NUMERIC DEFAULT 0,
  reward_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can create referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

-- Promotion Campaigns
CREATE TABLE public.promotion_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  discount_percentage NUMERIC NOT NULL,
  target_segment TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promotion_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage own campaigns"
  ON public.promotion_campaigns FOR ALL
  USING (auth.uid() = creator_id);

-- Customer Segments
CREATE TABLE public.customer_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  criteria JSONB NOT NULL,
  customer_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage own segments"
  ON public.customer_segments FOR ALL
  USING (auth.uid() = creator_id);

-- Pricing Experiments
CREATE TABLE public.pricing_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  content_type TEXT NOT NULL,
  variant_a_price NUMERIC NOT NULL,
  variant_b_price NUMERIC NOT NULL,
  variant_a_conversions INTEGER DEFAULT 0,
  variant_b_conversions INTEGER DEFAULT 0,
  variant_a_views INTEGER DEFAULT 0,
  variant_b_views INTEGER DEFAULT 0,
  winner TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.pricing_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage own experiments"
  ON public.pricing_experiments FOR ALL
  USING (auth.uid() = creator_id);

-- Traffic Sources
CREATE TABLE public.traffic_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  source TEXT,
  medium TEXT,
  campaign TEXT,
  referrer TEXT,
  landing_page TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own traffic sources"
  ON public.traffic_sources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert traffic sources"
  ON public.traffic_sources FOR INSERT
  WITH CHECK (true);

-- Add expires_at to unlockables
ALTER TABLE public.unlockables ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;

-- Add watermark settings to creator_settings
ALTER TABLE public.creator_settings ADD COLUMN watermark_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.creator_settings ADD COLUMN watermark_text TEXT;

-- Add theme preference to profiles
ALTER TABLE public.profiles ADD COLUMN theme_preference TEXT DEFAULT 'system';
ALTER TABLE public.profiles ADD COLUMN language_preference TEXT DEFAULT 'en';

-- Create indexes for performance
CREATE INDEX idx_tips_creator ON public.tips(creator_id);
CREATE INDEX idx_tips_tipper ON public.tips(tipper_id);
CREATE INDEX idx_subscriptions_customer ON public.creator_subscriptions(customer_id);
CREATE INDEX idx_subscriptions_tier ON public.creator_subscriptions(tier_id);
CREATE INDEX idx_comments_unlockable ON public.content_comments(unlockable_id);
CREATE INDEX idx_wishlists_customer ON public.wishlists(customer_id);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_traffic_sources_user ON public.traffic_sources(user_id);