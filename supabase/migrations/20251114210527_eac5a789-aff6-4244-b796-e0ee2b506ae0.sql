-- Enable realtime for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- The messages table will be published to realtime automatically