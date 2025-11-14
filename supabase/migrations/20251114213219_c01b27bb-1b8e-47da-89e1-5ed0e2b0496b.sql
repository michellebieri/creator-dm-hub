-- Update unlockables RLS to allow updates for unlocking
CREATE POLICY "Users can update unlockables they unlock"
ON public.unlockables
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE m.id = unlockables.message_id 
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE m.id = unlockables.message_id 
    AND (c.creator_id = auth.uid() OR c.customer_id = auth.uid())
  )
);