-- Migration to add order_type to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'Ads';

-- Update existing records to have 'Ads' as default
UPDATE orders SET order_type = 'Ads' WHERE order_type IS NULL;
