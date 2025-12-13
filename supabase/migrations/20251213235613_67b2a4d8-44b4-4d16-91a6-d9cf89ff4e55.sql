-- Create atomic function for spending bundle credits
CREATE OR REPLACE FUNCTION public.spend_bundle_credit(
  p_customer_id UUID,
  p_creator_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_credits_remaining INTEGER;
  v_credit_id UUID;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT id, credits_remaining INTO v_credit_id, v_credits_remaining
  FROM customer_credits
  WHERE customer_id = p_customer_id 
    AND creator_id = p_creator_id
    AND credits_remaining > 0
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;
  
  IF v_credit_id IS NULL OR v_credits_remaining <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No credits remaining');
  END IF;
  
  UPDATE customer_credits
  SET credits_remaining = v_credits_remaining - 1,
      updated_at = NOW()
  WHERE id = v_credit_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'remaining', v_credits_remaining - 1,
    'credit_id', v_credit_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create atomic function for spending subscription messages
CREATE OR REPLACE FUNCTION public.spend_subscription_message(
  p_subscription_id UUID,
  p_customer_id UUID,
  p_creator_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_messages_allowed INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_messages_used INTEGER;
  v_usage_id UUID;
BEGIN
  -- Try to get existing usage record with lock
  SELECT id, messages_used 
  INTO v_usage_id, v_messages_used
  FROM subscription_message_usage
  WHERE subscription_id = p_subscription_id
    AND period_start = p_period_start
  FOR UPDATE;
  
  IF v_usage_id IS NULL THEN
    -- Create new record (first message in period)
    INSERT INTO subscription_message_usage (
      subscription_id,
      customer_id,
      creator_id,
      period_start,
      period_end,
      messages_used,
      messages_allowed
    ) VALUES (
      p_subscription_id,
      p_customer_id,
      p_creator_id,
      p_period_start,
      p_period_end,
      1,
      p_messages_allowed
    )
    RETURNING id INTO v_usage_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'remaining', p_messages_allowed - 1,
      'usage_id', v_usage_id
    );
  END IF;
  
  IF v_messages_used >= p_messages_allowed THEN
    RETURN jsonb_build_object('success', false, 'error', 'No messages remaining');
  END IF;
  
  UPDATE subscription_message_usage
  SET messages_used = v_messages_used + 1,
      updated_at = NOW()
  WHERE id = v_usage_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'remaining', p_messages_allowed - v_messages_used - 1,
    'usage_id', v_usage_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;