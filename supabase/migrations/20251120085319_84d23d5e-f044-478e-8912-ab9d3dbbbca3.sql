-- Add welcome message fields to creator_settings
ALTER TABLE creator_settings
ADD COLUMN IF NOT EXISTS welcome_message_1 TEXT,
ADD COLUMN IF NOT EXISTS welcome_message_2 TEXT,
ADD COLUMN IF NOT EXISTS welcome_message_3 TEXT;