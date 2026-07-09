-- Add prepayment columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'COD',
ADD COLUMN IF NOT EXISTS prepayment_amount DECIMAL(10, 2) DEFAULT 0;
