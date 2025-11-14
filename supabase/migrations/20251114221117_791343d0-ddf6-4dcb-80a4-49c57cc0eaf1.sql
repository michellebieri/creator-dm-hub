-- Add 'voice' to message_type enum
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'voice';

-- Add voice_url column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS voice_url TEXT;

-- Add duration column for voice messages (in seconds)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS voice_duration INTEGER;