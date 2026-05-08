-- SECURITY DEFINER function so clients can record completed transactions
-- without needing direct INSERT access to the transactions table.
-- Validates that the caller is the customer (prevents inserting on behalf of others).
CREATE OR REPLACE FUNCTION public.insert_completed_transaction(
  p_creator_id     UUID,
  p_amount         NUMERIC,
  p_transaction_type TEXT,  -- 'message' | 'pack' | 'unlockable'
  p_platform_fee   NUMERIC DEFAULT NULL,
  p_processor_fee  NUMERIC DEFAULT 0,
  p_net_amount     NUMERIC DEFAULT NULL,
  p_message_id     UUID    DEFAULT NULL,
  p_bundle_id      UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_platform_fee NUMERIC;
  v_net_amount   NUMERIC;
  v_tx_id        UUID;
BEGIN
  -- Caller must be authenticated
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Cannot pay yourself
  IF v_customer_id = p_creator_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transact with yourself');
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  -- Validate transaction type against enum
  IF p_transaction_type NOT IN ('message', 'pack', 'unlockable') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transaction_type');
  END IF;

  -- Default fee calculations (15% platform fee)
  v_platform_fee := COALESCE(p_platform_fee, ROUND(p_amount * 0.15, 2));
  v_net_amount   := COALESCE(p_net_amount,   ROUND(p_amount - v_platform_fee, 2));

  INSERT INTO transactions (
    creator_id,
    customer_id,
    amount,
    transaction_type,
    platform_fee,
    processor_fee,
    net_amount,
    status,
    message_id,
    bundle_id
  ) VALUES (
    p_creator_id,
    v_customer_id,
    p_amount,
    p_transaction_type::transaction_type,
    v_platform_fee,
    COALESCE(p_processor_fee, 0),
    v_net_amount,
    'completed',
    p_message_id,
    p_bundle_id
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_completed_transaction TO authenticated;
