-- Add amount column to rider_inventory table
ALTER TABLE rider_inventory ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2) DEFAULT 0;
