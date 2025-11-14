-- Create message templates table
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Creators can manage their own templates
CREATE POLICY "Creators can view their own templates"
ON message_templates FOR SELECT
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can insert their own templates"
ON message_templates FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own templates"
ON message_templates FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own templates"
ON message_templates FOR DELETE
USING (auth.uid() = creator_id);

-- Add trigger for updated_at
CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON message_templates
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Add index
CREATE INDEX idx_message_templates_creator ON message_templates(creator_id);