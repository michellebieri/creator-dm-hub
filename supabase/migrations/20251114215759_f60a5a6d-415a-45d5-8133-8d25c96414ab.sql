-- Add read receipt tracking to messages
ALTER TABLE messages ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN read_by UUID REFERENCES profiles(id);

-- Create index for read status queries
CREATE INDEX idx_messages_read_at ON messages(read_at);
CREATE INDEX idx_messages_read_by ON messages(read_by);