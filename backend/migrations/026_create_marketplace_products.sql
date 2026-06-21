-- Create marketplace_products table
CREATE TABLE IF NOT EXISTS marketplace_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create case-insensitive index for fast keyword searches
CREATE INDEX IF NOT EXISTS idx_mkt_products_name ON marketplace_products (LOWER(product_name));
