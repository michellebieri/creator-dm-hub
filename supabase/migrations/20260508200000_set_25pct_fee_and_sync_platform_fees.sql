-- ============================================================
-- Set platform fee to 25% and sync transactions → platform_fees
-- ============================================================

-- 1. Update platform_config to 25%
UPDATE public.platform_config SET platform_fee_percentage = 25.00;

-- 2. Replace insert_completed_transaction to use 25% AND write to platform_fees
CREATE OR REPLACE FUNCTION public.insert_completed_transaction(
  p_creator_id       UUID,
  p_amount           NUMERIC,
  p_transaction_type TEXT,
  p_platform_fee     NUMERIC DEFAULT NULL,
  p_processor_fee    NUMERIC DEFAULT 0,
  p_net_amount       NUMERIC DEFAULT NULL,
  p_message_id       UUID    DEFAULT NULL,
  p_bundle_id        UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id  UUID;
  v_platform_fee NUMERIC;
  v_net_amount   NUMERIC;
  v_tx_id        UUID;
  v_fee_id       UUID;
BEGIN
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF v_customer_id = p_creator_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transact with yourself');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  IF p_transaction_type NOT IN ('message', 'pack', 'unlockable') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transaction_type');
  END IF;

  -- 25% platform fee, 75% to creator
  v_platform_fee := COALESCE(p_platform_fee, ROUND(p_amount * 0.25, 2));
  v_net_amount   := COALESCE(p_net_amount,   ROUND(p_amount - v_platform_fee, 2));

  -- Insert into transactions
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

  -- Mirror into platform_fees so revenue dashboards stay in sync
  INSERT INTO platform_fees (
    transaction_id,
    creator_id,
    gross_amount,
    platform_fee_amount,
    creator_net_amount,
    status
  ) VALUES (
    v_tx_id,
    p_creator_id,
    p_amount,
    v_platform_fee,
    v_net_amount,
    'completed'
  )
  RETURNING id INTO v_fee_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'platform_fee_id', v_fee_id,
    'platform_fee', v_platform_fee,
    'creator_net', v_net_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_completed_transaction TO authenticated;
