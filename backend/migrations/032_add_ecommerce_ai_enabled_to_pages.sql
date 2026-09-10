-- Add is_ecommerce_ai_enabled column to pages table
ALTER TABLE pages
ADD COLUMN IF NOT EXISTS is_ecommerce_ai_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN pages.is_ecommerce_ai_enabled IS 'When true, AI is allowed to query the live ecommerce website database, quote exact prices, specifications, and send product links.';
