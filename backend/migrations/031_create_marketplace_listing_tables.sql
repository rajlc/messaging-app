-- Migration 031: Create Marketplace Listing Tables

-- 1. Marketplace Profiles Table
CREATE TABLE IF NOT EXISTS marketplace_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    last_description TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed initial default profile
INSERT INTO marketplace_profiles (name, last_description)
VALUES ('Default', '')
ON CONFLICT (name) DO NOTHING;

-- 2. Marketplace Categories Table
CREATE TABLE IF NOT EXISTS marketplace_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed common Marketplace categories
INSERT INTO marketplace_categories (name) VALUES
('Electronics'),
('Home & Kitchen'),
('Furniture'),
('Clothing & Shoes'),
('Tools'),
('Beauty & Personal Care'),
('Toys & Games'),
('Sports & Outdoors')
ON CONFLICT (name) DO NOTHING;

-- 3. Marketplace Locations Table
CREATE TABLE IF NOT EXISTS marketplace_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed initial Kathmandu location
INSERT INTO marketplace_locations (name) VALUES
('Kathmandu'),
('Lalitpur'),
('Bhaktapur'),
('Pokhara'),
('Biratnagar')
ON CONFLICT (name) DO NOTHING;

-- 4. Marketplace Products Table
CREATE TABLE IF NOT EXISTS marketplace_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT,
    price NUMERIC,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'General',
    condition TEXT DEFAULT 'New',
    location TEXT DEFAULT 'Kathmandu',
    images TEXT[] DEFAULT '{}',
    profile_data JSONB DEFAULT '{}'::jsonb,
    status_map JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add columns if marketplace_products was created previously with older schema
ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'New';
ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Kathmandu';
ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS status_map JSONB DEFAULT '{}'::jsonb;
ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS inventory_id TEXT;
ALTER TABLE marketplace_products ALTER COLUMN product_name DROP NOT NULL;
ALTER TABLE marketplace_products ALTER COLUMN price DROP NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_products_category ON marketplace_products(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_created_at ON marketplace_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_inventory_id ON marketplace_products(inventory_id);

