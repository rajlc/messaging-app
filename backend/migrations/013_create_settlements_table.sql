-- Create rider_settlements table
CREATE TABLE IF NOT EXISTS rider_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID REFERENCES users(id) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    settlement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rider_settlements ENABLE ROW LEVEL SECURITY;

-- Create policy for admins/editors
CREATE POLICY "Admins can manage settlements" ON rider_settlements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.role = 'admin' OR users.role = 'editor')
        )
    );

-- Create policy for riders to view their own settlements
CREATE POLICY "Riders can view own settlements" ON rider_settlements
    FOR SELECT USING (auth.uid() = rider_id);
