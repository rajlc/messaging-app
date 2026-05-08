-- Add courier_status column to the orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS courier_status TEXT;
