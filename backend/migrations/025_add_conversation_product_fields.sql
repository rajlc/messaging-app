-- Add product_name and product_price to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS product_price TEXT;

COMMENT ON COLUMN conversations.product_name IS 'The name of the Marketplace product listing associated with this conversation.';
COMMENT ON COLUMN conversations.product_price IS 'The price of the Marketplace product listing associated with this conversation.';
