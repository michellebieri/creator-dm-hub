-- Grant authenticated users permission to read/write their own ai_personas row.
-- RLS policies already restrict to creator_id = auth.uid() — this just unlocks
-- the table so the policies can run.
GRANT SELECT, INSERT, UPDATE ON public.creator_ai_personas TO authenticated;
