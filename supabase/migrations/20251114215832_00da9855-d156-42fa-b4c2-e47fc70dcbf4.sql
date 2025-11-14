-- Allow users to update read status on messages they can view
CREATE POLICY "Users can update read status on messages they receive"
ON messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.creator_id = auth.uid() OR conversations.customer_id = auth.uid())
  )
  AND messages.sender_id != auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.creator_id = auth.uid() OR conversations.customer_id = auth.uid())
  )
  AND messages.sender_id != auth.uid()
);