-- Add is_delivery_person to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_delivery_person BOOLEAN DEFAULT FALSE;

-- Add assigned_rider_id to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_rider_id UUID REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_by TEXT;
