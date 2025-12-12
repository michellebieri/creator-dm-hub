-- Create atomic wallet spend function to prevent race conditions
CREATE OR REPLACE FUNCTION public.spend_wallet_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_transaction_type TEXT,
  p_description TEXT,
  p_related_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_result JSONB;
BEGIN
  -- Lock the row for update to prevent race conditions
  SELECT wallet_balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient balance',
      'current_balance', v_current_balance,
      'required_amount', p_amount
    );
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance - p_amount;

  -- Update balance atomically
  UPDATE profiles
  SET wallet_balance = v_new_balance
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO wallet_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    related_user_id,
    balance_after
  ) VALUES (
    p_user_id,
    -p_amount,
    p_transaction_type,
    p_description,
    p_related_user_id,
    v_new_balance
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'amount_spent', p_amount
  );
END;
$$;