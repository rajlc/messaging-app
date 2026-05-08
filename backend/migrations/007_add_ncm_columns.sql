-- Add NCM-specific columns to the orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS ncm_from_branch TEXT,
ADD COLUMN IF NOT EXISTS ncm_to_branch TEXT,
ADD COLUMN IF NOT EXISTS ncm_delivery_type TEXT;
