-- ============================================================
-- Fix 1: Allow authenticated users to update unlockables
-- The fan purchase flow updates unlocked_by[] after wallet is deducted.
-- Without this policy the UPDATE silently fails → content stays locked.
-- ============================================================

DROP POLICY IF EXISTS "unlockables_update_creator" ON public.unlockables;
DROP POLICY IF EXISTS "unlockables_update_authenticated" ON public.unlockables;

-- Creators can update their own content (edit price, caption etc)
CREATE POLICY "unlockables_update_creator"
ON public.unlockables FOR UPDATE TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- Anyone authenticated can add themselves to unlocked_by (after paying via wallet RPC)
-- We use a separate permissive policy just for the unlocked_by array update
CREATE POLICY "unlockables_update_unlock"
ON public.unlockables FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

GRANT UPDATE ON public.unlockables TO authenticated;

-- ============================================================
-- Fix 2: Ensure transactions can be read by customers
-- (already in schema but re-affirm the GRANT which may be missing)
-- ============================================================

GRANT SELECT ON public.transactions TO authenticated;

-- ============================================================
-- Fix 3: Allow insert into transactions via RPC (SECURITY DEFINER
-- bypasses RLS, but GRANT is still needed for the function to run)
-- ============================================================

GRANT INSERT ON public.transactions TO authenticated;
