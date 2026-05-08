-- Add AI columns to pages table
ALTER TABLE pages
ADD COLUMN IF NOT EXISTS is_ai_enabled BOOLEAN DEFAULT false;

ALTER TABLE pages
ADD COLUMN IF NOT EXISTS custom_prompt TEXT;

-- Ensure settings table exists
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OPTIONAL: Insert default global setting if not exists
INSERT INTO settings (key, value)
VALUES ('is_ai_global_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
