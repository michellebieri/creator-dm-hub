-- SECURITY DEFINER RPC so creators can see real platform averages
-- without exposing individual transaction data (returns only aggregates)
CREATE OR REPLACE FUNCTION public.get_platform_benchmark_stats()
RETURNS TABLE (
    creator_id uuid,
    total_revenue numeric,
    unique_customers bigint,
    total_transactions bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        t.creator_id,
        COALESCE(SUM(t.net_amount), 0)           AS total_revenue,
        COUNT(DISTINCT t.customer_id)             AS unique_customers,
        COUNT(*)                                  AS total_transactions
    FROM public.transactions t
    WHERE t.status = 'completed'
    GROUP BY t.creator_id
$$;

-- Only authenticated users can call this (RLS won't apply inside SECURITY DEFINER,
-- but we grant to authenticated role only)
REVOKE ALL ON FUNCTION public.get_platform_benchmark_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_benchmark_stats() TO authenticated;
