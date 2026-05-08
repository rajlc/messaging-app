-- Create rider_inventory table
CREATE TABLE IF NOT EXISTS rider_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES users(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    amount DECIMAL(10, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'assigned', -- 'assigned', 'sold', 'returned'
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rider_inventory ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage all rider inventory" ON rider_inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Riders can view their own inventory" ON rider_inventory FOR SELECT USING (rider_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_rider_inventory_rider_id ON rider_inventory(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_inventory_status ON rider_inventory(status);
