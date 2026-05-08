-- Create pages table if it doesn't exist
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,
    page_name TEXT,
    page_id TEXT UNIQUE NOT NULL,
    access_token TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- AI fields
    is_ai_enabled BOOLEAN DEFAULT false,
    custom_prompt TEXT
);

-- Create settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default global AI setting
INSERT INTO settings (key, value)
VALUES ('is_ai_global_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS for security (optional but recommended)
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies (modify as needed for your auth setup)
-- For now, allowing all access for simplicity, but you should restrict this!
CREATE POLICY "Allow all access to pages" ON pages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to settings" ON settings FOR ALL USING (true) WITH CHECK (true);
