-- Atomic upsert for customer_credits: increments credits_remaining on conflict.
-- Fixes the bug where a second purchase of the same pack fails with a unique
-- constraint violation because the webhook used a plain INSERT.

CREATE OR REPLACE FUNCTION public.add_customer_credits(
  p_customer_id UUID,
  p_creator_id  UUID,
  p_pack_id     UUID,
  p_quantity    INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO customer_credits (customer_id, creator_id, pack_id, credits_remaining)
  VALUES (p_customer_id, p_creator_id, p_pack_id, p_quantity)
  ON CONFLICT (customer_id, creator_id, pack_id)
  DO UPDATE SET
    credits_remaining = customer_credits.credits_remaining + EXCLUDED.credits_remaining,
    updated_at        = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_customer_credits TO service_role;
