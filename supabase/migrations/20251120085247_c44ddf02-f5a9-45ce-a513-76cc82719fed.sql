-- Add new fields to creator_settings for messaging configuration
ALTER TABLE creator_settings
ADD COLUMN IF NOT EXISTS bulk_message_amount INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS bulk_message_price NUMERIC DEFAULT 45.00,
ADD COLUMN IF NOT EXISTS first_three_free BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_messaging BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gift_messages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS gift_message_count INTEGER DEFAULT 5;

-- Add social media links to creator_settings
ALTER TABLE creator_settings
ADD COLUMN IF NOT EXISTS social_facebook TEXT,
ADD COLUMN IF NOT EXISTS social_instagram TEXT,
ADD COLUMN IF NOT EXISTS social_tiktok TEXT,
ADD COLUMN IF NOT EXISTS social_youtube TEXT,
ADD COLUMN IF NOT EXISTS social_twitch TEXT,
ADD COLUMN IF NOT EXISTS social_twitter TEXT,
ADD COLUMN IF NOT EXISTS social_snapchat TEXT,
ADD COLUMN IF NOT EXISTS social_other_url TEXT;

-- Add new fields to subscription_tiers
ALTER TABLE subscription_tiers
ADD COLUMN IF NOT EXISTS discount_comment TEXT,
ADD COLUMN IF NOT EXISTS free_messages_per_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unlimited_messages BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0;

-- Add new fields to content_bundles
ALTER TABLE content_bundles
ADD COLUMN IF NOT EXISTS original_price NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS messages_included INTEGER DEFAULT 0;