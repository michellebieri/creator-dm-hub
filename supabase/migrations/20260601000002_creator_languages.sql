ALTER TABLE creator_ai_personas
  ADD COLUMN IF NOT EXISTS supported_languages TEXT[] DEFAULT ARRAY['English'];

UPDATE creator_ai_personas
SET supported_languages = ARRAY['English']
WHERE supported_languages IS NULL;
