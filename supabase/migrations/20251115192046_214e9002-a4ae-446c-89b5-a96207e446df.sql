-- Add wallet balance to profiles
ALTER TABLE profiles ADD COLUMN wallet_balance NUMERIC(10,2) DEFAULT 0.00 NOT NULL;

-- Create wallet transactions table
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  transaction_type TEXT NOT NULL, -- 'deposit', 'message', 'tip', 'subscription', 'unlock'
  description TEXT,
  related_user_id UUID REFERENCES profiles(id), -- creator for spending transactions
  balance_after NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on wallet_transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own wallet transactions
CREATE POLICY "Users can view own wallet transactions"
ON wallet_transactions FOR SELECT
USING (auth.uid() = user_id);

-- System can insert wallet transactions
CREATE POLICY "System can insert wallet transactions"
ON wallet_transactions FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);