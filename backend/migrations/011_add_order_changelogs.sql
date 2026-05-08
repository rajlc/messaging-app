-- Create order_changelogs table
CREATE TABLE IF NOT EXISTS order_changelogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    logistic_id TEXT NOT NULL,
    old_amount NUMERIC(10, 2),
    new_amount NUMERIC(10, 2),
    old_delivery_charge NUMERIC(10, 2),
    new_delivery_charge NUMERIC(10, 2),
    log_details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE order_changelogs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all for now (matching other tables in this dev env)
CREATE POLICY "Allow all on order_changelogs" ON order_changelogs FOR ALL USING (true);
